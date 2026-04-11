const crypto = require('crypto')
const { getCollection, command } = require('../config/database')
const { getAllDocumentsFromQuery } = require('./batch-parts')
const { adjustInventory } = require('./inventory')

const SHIPMENTS_COLLECTION = 'shipment_orders'
const BATCHES_COLLECTION = 'delivery_batches'
const ASSEMBLY_COLLECTION = 'assembly_orders'
const ADDRESSES_COLLECTION = 'addresses'
const CONTRACTS_COLLECTION = 'contracts'
const USERS_COLLECTION = 'users'

async function generateShipmentNo() {
  const now = new Date()
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('')

  const prefix = `SH-${datePart}-`
  const countResult = await getCollection(SHIPMENTS_COLLECTION).count().catch(() => ({ total: 0 }))
  const sequence = String(Number(countResult.total || 0) + 1).padStart(3, '0')
  return `${prefix}${sequence}`
}

function createH5Token() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return crypto.randomBytes(16).toString('hex')
}

function buildH5Url(token) {
  const baseUrl = process.env.H5_BASE_URL || ''
  if (!baseUrl) {
    return `/h5/shipment/index.html?token=${token}`
  }

  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}token=${token}`
}

async function findAddressById(addressId) {
  if (!addressId) {
    return null
  }

  const result = await getCollection(ADDRESSES_COLLECTION).doc(addressId).get()
  return result.data || null
}

async function findBatchPartByIdGlobal(batchPartId) {
  if (!batchPartId) {
    return null
  }

  const batches = await getAllDocumentsFromQuery(getCollection(BATCHES_COLLECTION))
  for (const batch of batches) {
    const partIndex = (batch.parts || []).findIndex((item) => item.part_id === batchPartId)
    if (partIndex >= 0) {
      return {
        kind: 'batch_part',
        batch,
        part: batch.parts[partIndex],
        partIndex,
        batchId: batch._id,
        contractId: batch.contract_id,
        shipperOrgId: batch.supplier_org_id,
        shipperName: batch.supplier_name,
        currentStatus: batch.parts[partIndex].status,
        plannedQty: Number(batch.parts[partIndex].actual_qty || batch.parts[partIndex].planned_qty || 0),
        itemName: batch.parts[partIndex].part_name || '',
        itemType: 'part',
        partTypeId: batch.parts[partIndex].part_type_id || '',
        skuId: '',
        batchNo: batch.batch_no,
        contractNo: batch.contract_no || ''
      }
    }
  }

  return null
}

async function findAssemblyOrderById(assemblyOrderId) {
  if (!assemblyOrderId) {
    return null
  }

  try {
    const result = await getCollection(ASSEMBLY_COLLECTION).doc(assemblyOrderId).get()
    const order = result.data || null
    if (!order) {
      return null
    }

    return {
      kind: 'assembly_order',
      order,
      batch: null,
      part: null,
      partIndex: -1,
      batchId: '',
      contractId: '',
      shipperOrgId: order.org_id,
      shipperName: order.org_name || '',
      currentStatus: order.status,
      plannedQty: Number(order.qty || 0),
      itemName: order.sku_spec || '',
      itemType: 'product',
      partTypeId: '',
      skuId: order.sku_id || '',
      batchNo: null,
      contractNo: ''
    }
  } catch (error) {
    return null
  }
}

async function resolveShipmentTarget({ batchPartId, assemblyOrderId }) {
  if (batchPartId) {
    return findBatchPartByIdGlobal(batchPartId)
  }

  if (assemblyOrderId) {
    return findAssemblyOrderById(assemblyOrderId)
  }

  return null
}

async function updateTargetStatus(target, nextStatus, extraData = {}) {
  const now = extraData.status_updated_at || new Date().toISOString()

  if (target.kind === 'batch_part') {
    const nextParts = [...(target.batch.parts || [])]
    nextParts[target.partIndex] = {
      ...target.part,
      ...extraData,
      status: nextStatus,
      status_updated_at: now
    }

    await getCollection(BATCHES_COLLECTION).doc(target.batch._id).update({
      data: {
        parts: nextParts
      }
    })

    target.batch.parts = nextParts
    target.part = nextParts[target.partIndex]
    target.currentStatus = nextStatus
    return
  }

  await getCollection(ASSEMBLY_COLLECTION).doc(target.order._id).update({
    data: {
      ...extraData,
      status: nextStatus,
      status_updated_at: now
    }
  })

  target.order = {
    ...target.order,
    ...extraData,
    status: nextStatus,
    status_updated_at: now
  }
  target.currentStatus = nextStatus
}

async function syncContractStatus(contractId) {
  if (!contractId) {
    return
  }

  const batches = await getAllDocumentsFromQuery(
    getCollection(BATCHES_COLLECTION).where({ contract_id: contractId })
  )

  if (batches.length === 0) {
    return
  }

  const allArrived = batches.every((batch) => (batch.parts || []).length > 0 && (batch.parts || []).every((part) => part.status === 'ARRIVED'))
  if (!allArrived) {
    return
  }

  await getCollection(CONTRACTS_COLLECTION).doc(contractId).update({
    data: {
      status: 'COMPLETED',
      updated_at: new Date().toISOString()
    }
  })
}

async function safeCreateNotification(payload) {
  if (!payload || !payload.type) {
    return
  }

  try {
    const recipientIds = await resolveNotificationRecipients(payload)
    if (recipientIds.length === 0) {
      return
    }

    const now = new Date().toISOString()
    for (const userId of recipientIds) {
      await getCollection('notifications').add({
        data: {
          user_id: userId,
          type: payload.type,
          title: payload.title || '',
          content: payload.content || '',
          reference_type: payload.referenceType || payload.targetType || '',
          reference_id: payload.referenceId || payload.targetId || '',
          target_type: payload.targetType || payload.referenceType || '',
          target_id: payload.targetId || payload.referenceId || '',
          is_read: false,
          read: false,
          created_at: now
        }
      })
    }
  } catch (error) {
    console.warn('[notification] skipped:', error.message)
  }
}

async function resolveNotificationRecipients(payload = {}) {
  const recipientIds = new Set(normalizeStringList([
    payload.receiverUserId,
    ...(Array.isArray(payload.receiverUserIds) ? payload.receiverUserIds : [])
  ]))
  const receiverRoles = expandReceiverRoles(normalizeStringList([
    payload.receiverRole,
    ...(Array.isArray(payload.receiverRoles) ? payload.receiverRoles : [])
  ]))
  const receiverOrgIds = normalizeStringList([
    payload.receiverOrgId,
    ...(Array.isArray(payload.receiverOrgIds) ? payload.receiverOrgIds : [])
  ])

  if (receiverRoles.length > 0) {
    const users = await getAllDocumentsFromQuery(
      getCollection(USERS_COLLECTION).where({
        role: command.in(receiverRoles)
      })
    )
    users.forEach((user) => {
      if (user?._id && user.status !== 'disabled') {
        recipientIds.add(user._id)
      }
    })
  }

  if (receiverOrgIds.length > 0) {
    const users = await getAllDocumentsFromQuery(
      getCollection(USERS_COLLECTION).where({
        org_id: command.in(receiverOrgIds)
      })
    )
    users.forEach((user) => {
      if (user?._id && user.status !== 'disabled') {
        recipientIds.add(user._id)
      }
    })
  }

  return Array.from(recipientIds)
}

async function completeShipmentArrival({
  shipment,
  authUserId = '',
  items = [],
  photos = [],
  skipInventory = false
}) {
  const itemMap = new Map(
    (Array.isArray(items) ? items : [])
      .filter(Boolean)
      .map((item) => [item.itemId || item.item_id, item])
  )
  const nextItems = []

  for (const shipmentItem of shipment.items || []) {
    const payload = itemMap.get(shipmentItem.item_id) || {}
    const actualReceivedQty = Number(
      payload.actualReceivedQty != null ? payload.actualReceivedQty : shipmentItem.actual_qty || 0
    )
    if (!Number.isFinite(actualReceivedQty) || actualReceivedQty < 0) {
      const error = new Error(`货品 ${shipmentItem.item_name || ''} 的收货数量不正确`)
      error.code = 400
      throw error
    }

    const hasException = Boolean(payload.hasException) || actualReceivedQty !== Number(shipmentItem.actual_qty || 0)
    const exceptionNote = hasException
      ? String(payload.exceptionNote || '').trim()
      : ''

    const target = await resolveShipmentTarget({
      batchPartId: shipmentItem.batch_part_id,
      assemblyOrderId: shipmentItem.assembly_order_id
    })
    if (target) {
      await updateTargetStatus(target, 'ARRIVED')
      if (target.kind === 'batch_part') {
        await syncContractStatus(target.contractId)
      }

      if (!skipInventory && shipment.destination_type !== 'freight' && target.itemType === 'part') {
        await adjustInventory({
          orgId: shipment.to_org_id,
          orgName: shipment.to_org_name,
          itemType: 'part',
          partTypeId: target.partTypeId,
          itemName: target.itemName,
          changeQty: actualReceivedQty,
          changeType: 'receive_in',
          referenceType: 'shipment_order',
          referenceId: shipment._id,
          reason: hasException ? exceptionNote : '',
          operatorId: authUserId
        })
      }
    }

    nextItems.push({
      ...shipmentItem,
      actual_received_qty: actualReceivedQty,
      has_exception: hasException,
      exception_note: exceptionNote,
      diff_qty: actualReceivedQty - Number(shipmentItem.actual_qty || 0)
    })
  }

  const now = new Date().toISOString()
  await getCollection(SHIPMENTS_COLLECTION).doc(shipment._id).update({
    data: {
      items: nextItems,
      status: 'ARRIVED',
      workflow_status: 'COMPLETED',
      arrival_photos: Array.isArray(photos) ? photos : [],
      arrival_confirmed_by: authUserId,
      arrival_confirmed_at: now,
      updated_at: now
    }
  })

  return {
    shipmentId: shipment._id,
    status: 'ARRIVED',
    arrivalConfirmedAt: now,
    items: nextItems
  }
}

function buildShipmentSummary(shipment) {
  const items = Array.isArray(shipment.items) ? shipment.items : []
  const plannedQty = items.reduce((sum, item) => sum + Number(item.planned_qty || 0), 0)
  const actualQty = items.reduce((sum, item) => sum + Number(item.actual_qty || 0), 0)
  const receivedQty = items.reduce((sum, item) => sum + Number(item.actual_received_qty || 0), 0)
  const hasModifiedQty = items.some((item) => Number(item.actual_qty || 0) !== Number(item.planned_qty || 0))
  const hasExceptions = items.some((item) => item.has_exception)

  return {
    ...shipment,
    item_count: items.length,
    planned_total_qty: plannedQty,
    actual_total_qty: actualQty,
    received_total_qty: receivedQty,
    need_confirm: Boolean(shipment.need_confirm || hasModifiedQty),
    has_modified_qty: hasModifiedQty,
    has_exceptions: hasExceptions
  }
}

function normalizeStringList(values = []) {
  return Array.from(new Set(
    values
      .flatMap((item) => Array.isArray(item) ? item : [item])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  ))
}

function expandReceiverRoles(roles = []) {
  return Array.from(new Set(
    roles.flatMap((role) => {
      if (role === 'admin') {
        return ['super_admin', 'admin', 'merchandiser']
      }
      if (role === 'supplier') {
        return ['supplier_owner', 'supplier_member']
      }
      return [role]
    })
  ))
}

module.exports = {
  generateShipmentNo,
  createH5Token,
  buildH5Url,
  findAddressById,
  resolveShipmentTarget,
  updateTargetStatus,
  syncContractStatus,
  safeCreateNotification,
  buildShipmentSummary,
  completeShipmentArrival
}
