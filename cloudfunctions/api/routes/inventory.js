const { getCollection, command, createKeywordRegExp } = require('../config/database')
const { ensureAdminPermission } = require('../utils/access')

const INVENTORY_COLLECTION = 'inventory'
const INVENTORY_LOG_COLLECTION = 'inventory_change_logs'
const ORGS_COLLECTION = 'organizations'
const PART_TYPES_COLLECTION = 'part_types'
const PRODUCTS_COLLECTION = 'products'
const PERMISSION_KEY = 'module_inventory'

async function list({ params = {}, auth }) {
  await ensureAdminPermission(auth, PERMISSION_KEY)

  const { orgId = '', itemType = '', keyword = '' } = params
  const assemblyOrgs = await getAssemblyOrganizations()
  const assemblyOrgMap = new Map(assemblyOrgs.map((item) => [item._id, item]))

  if (!orgId && assemblyOrgs.length === 0) {
    return {
      summary: buildSummary([]),
      assemblyOrgs: [],
      list: [],
      logs: []
    }
  }

  const conditions = []
  if (orgId) {
    conditions.push({ org_id: orgId })
  } else {
    conditions.push({
      org_id: command.in(assemblyOrgs.map((item) => item._id))
    })
  }

  if (itemType) {
    conditions.push({ item_type: itemType })
  }

  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    if (keywordRegExp) {
      conditions.push(command.or([
        { item_name: keywordRegExp },
        { org_name: keywordRegExp }
      ]))
    }
  }

  const query = conditions.length > 0
    ? getCollection(INVENTORY_COLLECTION).where(command.and(conditions))
    : getCollection(INVENTORY_COLLECTION)
  const inventoryList = await getAllDocuments(query.orderBy('updated_at', 'desc'))

  const logsQuery = orgId
    ? getCollection(INVENTORY_LOG_COLLECTION).where({ org_id: orgId })
    : getCollection(INVENTORY_LOG_COLLECTION)
  const recentLogs = await getAllDocuments(logsQuery.orderBy('created_at', 'desc'), 50)

  const summary = buildSummary(inventoryList)

  return {
    summary,
    assemblyOrgs: assemblyOrgs.map((item) => ({
      _id: item._id,
      name: item.name || '',
      contact_phone: item.contact_phone || '',
      address: item.address || ''
    })),
    list: inventoryList.map((item) => ({
      ...item,
      org_name: item.org_name || assemblyOrgMap.get(item.org_id)?.name || ''
    })),
    logs: recentLogs
  }
}

async function history({ params = {}, auth }) {
  await ensureAdminPermission(auth, PERMISSION_KEY)

  const { inventoryId = '' } = params
  if (!inventoryId) {
    const error = new Error('缺少 inventoryId')
    error.code = 400
    throw error
  }

  const records = await getAllDocuments(
    getCollection(INVENTORY_LOG_COLLECTION)
      .where({ inventory_id: inventoryId })
      .orderBy('created_at', 'desc'),
    200
  )

  return {
    list: records
  }
}

async function upsert({ params = {}, auth }) {
  await ensureAdminPermission(auth, PERMISSION_KEY)

  const {
    id = '',
    orgId,
    itemType,
    partTypeId = '',
    skuId = '',
    wipQty = 0,
    semiQty = 0,
    finishedQty = 0,
    reason = ''
  } = params

  if (!orgId || !itemType) {
    const error = new Error('缺少必填字段：orgId、itemType')
    error.code = 400
    throw error
  }

  if (!String(reason || '').trim()) {
    const error = new Error('请填写本次库存调整原因')
    error.code = 400
    throw error
  }

  if (!['part', 'product'].includes(itemType)) {
    const error = new Error('库存类型不正确')
    error.code = 400
    throw error
  }

  if (itemType === 'part' && !partTypeId) {
    const error = new Error('配件库存必须选择配件')
    error.code = 400
    throw error
  }

  if (itemType === 'product' && !skuId) {
    const error = new Error('成品库存必须选择 SKU')
    error.code = 400
    throw error
  }

  const org = await getCollection(ORGS_COLLECTION).doc(orgId).get().catch(() => ({ data: null }))
  if (!org.data || !org.data.has_assembly) {
    const error = new Error('当前组织不是组装厂，不能维护库存')
    error.code = 400
    throw error
  }

  const itemMeta = await resolveInventoryItemMeta({ itemType, partTypeId, skuId })
  const now = new Date().toISOString()
  const nextValues = {
    wip_qty: normalizeQty(wipQty),
    semi_qty: normalizeQty(semiQty),
    finished_qty: normalizeQty(finishedQty)
  }

  let existing = null
  if (id) {
    existing = await getCollection(INVENTORY_COLLECTION).doc(id).get().catch(() => ({ data: null }))
    existing = existing.data || null
  }

  if (!existing) {
    const result = await getCollection(INVENTORY_COLLECTION)
      .where({
        org_id: orgId,
        item_type: itemType,
        part_type_id: itemType === 'part' ? partTypeId : null,
        sku_id: itemType === 'product' ? skuId : null
      })
      .limit(1)
      .get()
    existing = result.data[0] || null
  }

  if (!existing) {
    const doc = {
      org_id: orgId,
      org_name: org.data.name || '',
      item_type: itemType,
      part_type_id: itemType === 'part' ? partTypeId : null,
      sku_id: itemType === 'product' ? skuId : null,
      item_name: itemMeta.itemName,
      ...nextValues,
      created_at: now,
      updated_at: now
    }
    const addResult = await getCollection(INVENTORY_COLLECTION).add({ data: doc })
    await writeInventoryLogs({
      inventoryId: addResult._id,
      orgId,
      orgName: doc.org_name,
      itemName: doc.item_name,
      oldValues: { wip_qty: 0, semi_qty: 0, finished_qty: 0 },
      newValues: nextValues,
      operatorId: auth.user_id,
      reason
    })
    return { _id: addResult._id, ...doc }
  }

  const oldValues = {
    wip_qty: Number(existing.wip_qty || 0),
    semi_qty: Number(existing.semi_qty || 0),
    finished_qty: Number(existing.finished_qty || 0)
  }

  await getCollection(INVENTORY_COLLECTION).doc(existing._id).update({
    data: {
      org_name: org.data.name || existing.org_name || '',
      item_name: itemMeta.itemName || existing.item_name || '',
      ...nextValues,
      updated_at: now
    }
  })

  await writeInventoryLogs({
    inventoryId: existing._id,
    orgId,
    orgName: org.data.name || existing.org_name || '',
    itemName: itemMeta.itemName || existing.item_name || '',
    oldValues,
    newValues: nextValues,
    operatorId: auth.user_id,
    reason
  })

  return {
    ...existing,
    org_name: org.data.name || existing.org_name || '',
    item_name: itemMeta.itemName || existing.item_name || '',
    ...nextValues,
    updated_at: now
  }
}

function buildSummary(inventoryList = []) {
  const rows = inventoryList || []
  const totalPartItems = rows.filter((item) => item.item_type === 'part').length
  const totalProductItems = rows.filter((item) => item.item_type === 'product').length
  const totalFinishedQty = rows.reduce((sum, item) => sum + Number(item.finished_qty || 0), 0)
  const totalWipQty = rows.reduce((sum, item) => sum + Number(item.wip_qty || 0), 0)
  const totalSemiQty = rows.reduce((sum, item) => sum + Number(item.semi_qty || 0), 0)

  return {
    totalPartItems,
    totalProductItems,
    totalFinishedQty,
    totalWipQty,
    totalSemiQty
  }
}

async function getAssemblyOrganizations() {
  const result = await getCollection(ORGS_COLLECTION)
    .where({ has_assembly: true, cooperation_status: 'active' })
    .orderBy('name', 'asc')
    .get()
  return result.data || []
}

async function resolveInventoryItemMeta({ itemType, partTypeId, skuId }) {
  if (itemType === 'part') {
    const part = await getCollection(PART_TYPES_COLLECTION).doc(partTypeId).get().catch(() => ({ data: null }))
    return {
      itemName: part.data?.name || '未命名配件'
    }
  }

  const products = await getAllDocuments(getCollection(PRODUCTS_COLLECTION))
  for (const product of products) {
    const sku = (product.skus || []).find((item) => item.sku_id === skuId)
    if (sku) {
      return {
        itemName: sku.spec || sku.sku_id || product.name_cn || '未命名 SKU'
      }
    }
  }

  return {
    itemName: '未命名 SKU'
  }
}

async function writeInventoryLogs({ inventoryId, orgId, orgName, itemName, oldValues, newValues, operatorId, reason }) {
  const now = new Date().toISOString()
  const fieldMap = {
    wip_qty: '在制品',
    semi_qty: '半成品',
    finished_qty: '成品'
  }

  for (const key of Object.keys(fieldMap)) {
    const before = Number(oldValues[key] || 0)
    const after = Number(newValues[key] || 0)
    const diff = after - before
    if (!diff) {
      continue
    }

    await getCollection(INVENTORY_LOG_COLLECTION).add({
      data: {
        inventory_id: inventoryId,
        org_id: orgId,
        org_name: orgName || '',
        item_name: itemName || '',
        stock_field: key,
        change_type: 'manual_adjust',
        change_qty: diff,
        reference_type: 'inventory_manual',
        reference_id: inventoryId,
        reason: reason || `甲方手动更新${fieldMap[key]}库存`,
        operator_id: operatorId || '',
        created_at: now
      }
    })
  }
}

function normalizeQty(value) {
  const qty = Number(value || 0)
  return Number.isNaN(qty) ? 0 : Math.max(0, qty)
}

async function getAllDocuments(query, pageSize = 100) {
  const documents = []
  let offset = 0

  while (true) {
    const result = await query.skip(offset).limit(pageSize).get()
    documents.push(...(result.data || []))
    if ((result.data || []).length < pageSize) {
      break
    }
    offset += pageSize
  }

  return documents
}

module.exports = {
  'inventory.list': list,
  'inventory.history': history,
  'inventory.upsert': upsert
}
