const { getCollection } = require('../config/database')
const { ensureAdmin, ensureAdminPermission, ensureSupplierOrAdmin, ensureSupplierPermission, isSupplierRole, isAdminRole } = require('../utils/access')
const { findBatchPartById } = require('../utils/batch-parts')

const BATCHES_COLLECTION = 'delivery_batches'

async function markProduced({ params, auth }) {
  ensureSupplierOrAdmin(auth)
  if (isSupplierRole(auth?.role)) {
    await ensureSupplierPermission(auth, ['mark_produced'], '当前账号没有标记已生产权限')
  }
  if (isAdminRole(auth?.role)) {
    await ensureAdminPermission(auth, 'module_quality')
  }

  const { batchPartId, actualQty } = params
  if (!batchPartId) {
    const error = new Error('缺少批次配件 ID')
    error.code = 400
    throw error
  }

  const match = await findBatchPartById(batchPartId, auth)
  if (!match) {
    const error = new Error('批次配件不存在')
    error.code = 404
    throw error
  }

  const { batch, part, partIndex } = match
  if (part.status !== 'PENDING_PRODUCTION') {
    const error = new Error('当前状态不允许标记已生产')
    error.code = 409
    throw error
  }

  const now = new Date().toISOString()
  const normalizedActualQty = Number(actualQty != null ? actualQty : part.planned_qty || 0)
  const nextPart = {
    ...part,
    actual_qty: normalizedActualQty,
    status: 'PENDING_INSPECTION',
    status_updated_at: now
  }

  const nextParts = [...(batch.parts || [])]
  nextParts[partIndex] = nextPart

  await getCollection(BATCHES_COLLECTION).doc(batch._id).update({
    data: {
      parts: nextParts
    }
  })

  return {
    batchId: batch._id,
    batchNo: batch.batch_no,
    contractId: batch.contract_id,
    batchPartId,
    part: nextPart
  }
}

async function requireReinspect({ params, auth }) {
  ensureAdmin(auth)
  await ensureAdminPermission(auth, 'module_quality')

  const { batchPartId } = params
  if (!batchPartId) {
    const error = new Error('缺少批次配件 ID')
    error.code = 400
    throw error
  }

  const match = await findBatchPartById(batchPartId, auth)
  if (!match) {
    const error = new Error('批次配件不存在')
    error.code = 404
    throw error
  }

  const { batch, part, partIndex } = match
  if (part.status !== 'PENDING_SHIPMENT') {
    const error = new Error('当前状态不允许要求二次验货')
    error.code = 409
    throw error
  }

  const now = new Date().toISOString()
  const nextParts = [...(batch.parts || [])]
  nextParts[partIndex] = {
    ...part,
    status: 'PENDING_INSPECTION',
    status_updated_at: now
  }

  await getCollection(BATCHES_COLLECTION).doc(batch._id).update({
    data: {
      parts: nextParts
    }
  })

  return {
    batchId: batch._id,
    batchPartId,
    status: 'PENDING_INSPECTION',
    updatedAt: now
  }
}

module.exports = {
  'status.markProduced': markProduced,
  'status.requireReinspect': requireReinspect
}
