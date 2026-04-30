const { getCollection, command, createKeywordRegExp } = require('../config/database')

const COLLECTION = 'part_types'
const ORGANIZATION_COLLECTION = 'organizations'
const PRODUCT_COLLECTION = 'products'

async function list({ params }) {
  const { page = 1, pageSize = 100, keyword, category, supplier_org_id } = params || {}
  const col = getCollection(COLLECTION)
  const _ = command
  const conditions = []

  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { name: keywordRegExp },
      { category: keywordRegExp },
      { supplier_org_name: keywordRegExp }
    ]))
  }

  if (category) {
    conditions.push({ category })
  }

  if (supplier_org_id) {
    conditions.push({ supplier_org_id })
  }

  const whereClause = conditions.length > 0
    ? col.where(_.and(conditions))
    : col

  const countResult = await whereClause.count()
  const total = countResult.total
  const skip = (page - 1) * pageSize

  const listResult = await whereClause
    .orderBy('created_at', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  const list = (listResult.data || []).sort((a, b) => {
    const aKey = `${a.category || ''}-${a.name || ''}`
    const bKey = `${b.category || ''}-${b.name || ''}`
    return aKey.localeCompare(bKey, 'zh-CN')
  })

  return {
    list,
    total,
    page,
    pageSize
  }
}

async function create({ params }) {
  const {
    name,
    category,
    supplier_org_id,
    unit,
    unit_price,
    price_note,
    material,
    color,
    weight,
    size
  } = params || {}

  if (!name || !category || !supplier_org_id) {
    const error = new Error('缺少必填字段：name, category, supplier_org_id')
    error.code = 400
    throw error
  }

  const supplier = await loadOrganization(supplier_org_id)
  await ensureUniquePartType({
    name: String(name).trim(),
    category: String(category).trim(),
    supplier_org_id,
    material: String(material || '').trim(),
    color: String(color || '').trim(),
    size: String(size || '').trim()
  })

  const now = new Date().toISOString()
  const doc = {
    name: String(name).trim(),
    category: String(category).trim(),
    supplier_org_id,
    supplier_org_name: supplier.name,
    unit: normalizeUnit(unit),
    unit_price: normalizePrice(unit_price),
    price_note: String(price_note || '').trim(),
    material: String(material || '').trim(),
    color: String(color || '').trim(),
    weight: String(weight || '').trim(),
    size: String(size || '').trim(),
    created_at: now,
    updated_at: now
  }

  const result = await getCollection(COLLECTION).add({ data: doc })
  return { _id: result._id, ...doc }
}

async function update({ params }) {
  const { id, ...rawUpdates } = params || {}
  if (!id) {
    const error = new Error('缺少配件主数据 ID')
    error.code = 400
    throw error
  }

  const existingResult = await getCollection(COLLECTION).doc(id).get()
  const existing = existingResult.data
  if (!existing) {
    const error = new Error('配件主数据不存在')
    error.code = 404
    throw error
  }

  const updates = {}

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'name')) {
    updates.name = String(rawUpdates.name || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'category')) {
    updates.category = String(rawUpdates.category || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'supplier_org_id')) {
    const supplier = await loadOrganization(rawUpdates.supplier_org_id)
    updates.supplier_org_id = rawUpdates.supplier_org_id
    updates.supplier_org_name = supplier.name
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'unit')) {
    updates.unit = normalizeUnit(rawUpdates.unit)
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'unit_price')) {
    updates.unit_price = normalizePrice(rawUpdates.unit_price)
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'price_note')) {
    updates.price_note = String(rawUpdates.price_note || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'material')) {
    updates.material = String(rawUpdates.material || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'color')) {
    updates.color = String(rawUpdates.color || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'weight')) {
    updates.weight = String(rawUpdates.weight || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(rawUpdates, 'size')) {
    updates.size = String(rawUpdates.size || '').trim()
  }

  const nextRecord = {
    ...existing,
    ...updates
  }

  if (!nextRecord.name || !nextRecord.category || !nextRecord.supplier_org_id) {
    const error = new Error('配件名称、配件类别和供应商不能为空')
    error.code = 400
    throw error
  }

  await ensureUniquePartType({
    id,
    name: nextRecord.name,
    category: nextRecord.category,
    supplier_org_id: nextRecord.supplier_org_id,
    material: nextRecord.material,
    color: nextRecord.color,
    size: nextRecord.size
  })

  updates.updated_at = new Date().toISOString()

  await getCollection(COLLECTION).doc(id).update({
    data: updates
  })

  const changedName = updates.name && updates.name !== existing.name
  const changedSupplier = (
    updates.supplier_org_id && updates.supplier_org_id !== existing.supplier_org_id
  ) || (
    updates.supplier_org_name && updates.supplier_org_name !== existing.supplier_org_name
  )

  if (changedName || changedSupplier) {
    await propagatePartTypeSnapshotChange(id, {
      part_name: nextRecord.name,
      supplier_org_id: nextRecord.supplier_org_id,
      supplier_name: nextRecord.supplier_org_name
    })
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  return result.data
}

async function remove({ params }) {
  const { id } = params || {}
  if (!id) {
    const error = new Error('缺少配件主数据 ID')
    error.code = 400
    throw error
  }

  const existingResult = await getCollection(COLLECTION).doc(id).get()
  if (!existingResult.data) {
    const error = new Error('配件主数据不存在')
    error.code = 404
    throw error
  }

  const referenceCount = await countPartTypeReferences(id)
  if (referenceCount > 0) {
    const error = new Error('该配件主数据已被产品 BOM 引用，无法删除')
    error.code = 409
    throw error
  }

  await getCollection(COLLECTION).doc(id).remove()
  return { success: true }
}

async function bulkUpdate({ params }) {
  const list = Array.isArray(params?.list) ? params.list : []
  if (list.length === 0) {
    const error = new Error('缺少配件数据')
    error.code = 400
    throw error
  }

  const results = []
  for (const item of list) {
    results.push(await update({ params: item }))
  }

  return { list: results }
}

async function loadOrganization(orgId) {
  if (!orgId) {
    const error = new Error('缺少供应商 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(ORGANIZATION_COLLECTION).doc(orgId).get()
  if (!result.data) {
    const error = new Error('供应商不存在')
    error.code = 404
    throw error
  }

  return result.data
}

async function ensureUniquePartType({ id, name, category, supplier_org_id, material = '', color = '', size = '' }) {
  const duplicates = await getCollection(COLLECTION)
    .where({ name, category, supplier_org_id })
    .get()

  const nextFingerprint = buildPartTypeFingerprint({ name, category, supplier_org_id, material, color, size })
  const exists = (duplicates.data || []).some((item) => {
    if (item._id === id) {
      return false
    }
    return buildPartTypeFingerprint(item) === nextFingerprint
  })
  if (exists) {
    const error = new Error(`配件主数据已存在：${category} / ${name}`)
    error.code = 409
    throw error
  }
}

function buildPartTypeFingerprint(item = {}) {
  return [
    item.category,
    item.name,
    item.supplier_org_id,
    item.material,
    item.color,
    item.size
  ].map(value => String(value || '').trim()).join('|')
}

function normalizeUnit(unit) {
  const normalized = String(unit || '').trim()
  return normalized || '件'
}

function normalizePrice(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  if (Number.isNaN(numberValue) || numberValue < 0) {
    const error = new Error('参考单价必须是大于等于 0 的数字')
    error.code = 400
    throw error
  }

  return numberValue
}

async function countPartTypeReferences(partTypeId) {
  const products = await getAllDocuments(PRODUCT_COLLECTION)
  let count = 0

  products.forEach((product) => {
    ;(product.skus || []).forEach((sku) => {
      ;(sku.bom_items || []).forEach((item) => {
        if (item.part_type_id === partTypeId) {
          count += 1
        }
      })
    })
  })

  return count
}

async function propagatePartTypeSnapshotChange(partTypeId, snapshot) {
  const products = await getAllDocuments(PRODUCT_COLLECTION)

  for (const product of products) {
    let changed = false
    const nextSkus = (product.skus || []).map((sku) => {
      const nextBomItems = (sku.bom_items || []).map((item) => {
        if (item.part_type_id !== partTypeId) {
          return item
        }

        changed = true
        return {
          ...item,
          part_name: snapshot.part_name,
          supplier_org_id: snapshot.supplier_org_id,
          supplier_name: snapshot.supplier_name
        }
      })

      return {
        ...sku,
        bom_items: nextBomItems
      }
    })

    if (changed) {
      await getCollection(PRODUCT_COLLECTION).doc(product._id).update({
        data: {
          skus: nextSkus,
          updated_at: new Date().toISOString()
        }
      })
    }
  }
}

async function getAllDocuments(collectionName, pageSize = 100) {
  const collection = getCollection(collectionName)
  const documents = []
  let offset = 0

  while (true) {
    const result = await collection
      .skip(offset)
      .limit(pageSize)
      .get()

    documents.push(...result.data)

    if (result.data.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return documents
}

module.exports = {
  'partType.list': list,
  'partType.create': create,
  'partType.update': update,
  'partType.bulkUpdate': bulkUpdate,
  'partType.delete': remove
}

Object.defineProperty(module.exports, '__test', {
  value: {
    buildPartTypeFingerprint
  }
})
