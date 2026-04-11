const { getCollection, command } = require('../config/database')

const INVENTORY_COLLECTION = 'inventory'
const INVENTORY_LOG_COLLECTION = 'inventory_change_logs'

async function adjustInventory({
  orgId,
  orgName = '',
  itemType,
  partTypeId = null,
  skuId = null,
  itemName = '',
  changeQty,
  changeType,
  referenceType = '',
  referenceId = '',
  reason = '',
  operatorId = ''
}) {
  if (!orgId || !itemType) {
    const error = new Error('库存变更缺少组织或货品类型')
    error.code = 400
    throw error
  }

  const normalizedQty = Number(changeQty || 0)
  if (!normalizedQty) {
    return null
  }

  const where = {
    org_id: orgId,
    item_type: itemType
  }

  if (itemType === 'part') {
    where.part_type_id = partTypeId || ''
  } else {
    where.sku_id = skuId || ''
  }

  const result = await getCollection(INVENTORY_COLLECTION)
    .where(where)
    .limit(1)
    .get()

  const now = new Date().toISOString()
  let inventoryDoc = result.data[0] || null

  if (!inventoryDoc) {
    if (normalizedQty < 0) {
      const error = new Error('库存不足，无法执行扣减')
      error.code = 409
      throw error
    }

    const doc = {
      org_id: orgId,
      org_name: orgName || '',
      item_type: itemType,
      part_type_id: itemType === 'part' ? (partTypeId || '') : null,
      sku_id: itemType === 'product' ? (skuId || '') : null,
      item_name: itemName || '',
      wip_qty: 0,
      semi_qty: 0,
      finished_qty: normalizedQty,
      created_at: now,
      updated_at: now
    }

    const addResult = await getCollection(INVENTORY_COLLECTION).add({ data: doc })
    inventoryDoc = {
      _id: addResult._id,
      ...doc
    }
  } else {
    const nextQty = Number(inventoryDoc.finished_qty || 0) + normalizedQty
    if (nextQty < 0) {
      const error = new Error('库存不足，无法执行扣减')
      error.code = 409
      throw error
    }

    await getCollection(INVENTORY_COLLECTION).doc(inventoryDoc._id).update({
      data: {
        org_name: orgName || inventoryDoc.org_name || '',
        item_name: itemName || inventoryDoc.item_name || '',
        finished_qty: command.inc(normalizedQty),
        updated_at: now
      }
    })

    inventoryDoc = {
      ...inventoryDoc,
      org_name: orgName || inventoryDoc.org_name || '',
      item_name: itemName || inventoryDoc.item_name || '',
      finished_qty: nextQty,
      updated_at: now
    }
  }

  await getCollection(INVENTORY_LOG_COLLECTION).add({
    data: {
      inventory_id: inventoryDoc._id,
      org_id: orgId,
      org_name: orgName || inventoryDoc.org_name || '',
      item_name: itemName || inventoryDoc.item_name || '',
      change_type: changeType || 'manual_adjust',
      change_qty: normalizedQty,
      reference_type: referenceType || '',
      reference_id: referenceId || '',
      reason: reason || '',
      operator_id: operatorId || '',
      created_at: now
    }
  })

  return inventoryDoc
}

module.exports = {
  adjustInventory
}
