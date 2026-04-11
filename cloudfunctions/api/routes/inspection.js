const { getCollection, command } = require('../config/database')
const { ensureAdmin, ensureAdminPermission, isSupplierRole, isAdminRole } = require('../utils/access')
const { findBatchPartById, getVisibleBatches } = require('../utils/batch-parts')

const COLLECTION = 'inspection_records'
const BATCHES_COLLECTION = 'delivery_batches'

async function list({ params = {}, auth }) {
  if (isAdminRole(auth?.role)) {
    await ensureAdminPermission(auth, 'module_quality')
  }

  const { status = 'all', batchPartId } = params

  let targets = []
  if (batchPartId) {
    const match = await findBatchPartById(batchPartId, auth)
    if (!match) {
      const error = new Error('验货对象不存在')
      error.code = 404
      throw error
    }
    targets = [buildTargetRow(match.batch, match.part)]
  } else {
    const batches = await getVisibleBatches(auth)
    targets = batches.flatMap(batch => (batch.parts || []).map(part => buildTargetRow(batch, part)))
  }

  if (targets.length === 0) {
    return { list: [] }
  }

  const latestInspectionMap = await getLatestInspectionMap(targets.map(item => item.batchPartId))
  let list = targets.map(target => {
    const latestInspection = latestInspectionMap[target.batchPartId] || null
    return {
      ...target,
      latestInspection,
      displayStatus: buildDisplayStatus(target.currentStatus, latestInspection?.result)
    }
  })

  if (isSupplierRole(auth?.role)) {
    list = list.filter(item => item.supplierOrgId === auth.org_id)
  }

  if (status === 'pending') {
    list = list.filter(item => item.currentStatus === 'PENDING_INSPECTION')
  } else if (status === 'done') {
    list = list.filter(item => item.latestInspection)
  }

  list.sort((a, b) => {
    if (a.currentStatus === 'PENDING_INSPECTION' && b.currentStatus !== 'PENDING_INSPECTION') {
      return -1
    }
    if (a.currentStatus !== 'PENDING_INSPECTION' && b.currentStatus === 'PENDING_INSPECTION') {
      return 1
    }
    return `${b.plannedDate || ''}${b.batchNo || 0}`.localeCompare(`${a.plannedDate || ''}${a.batchNo || 0}`)
  })

  return { list }
}

async function create({ params = {}, auth }) {
  ensureAdmin(auth)
  await ensureAdminPermission(auth, 'module_quality')

  const {
    batchPartId,
    result,
    qualifiedQty,
    defectQty,
    defectDesc,
    note,
    defects = []
  } = params

  if (!batchPartId) {
    const error = new Error('缺少批次配件 ID')
    error.code = 400
    throw error
  }

  const normalizedResult = String(result || '').toUpperCase()
  if (!['PASS', 'PARTIAL_PASS', 'FAIL'].includes(normalizedResult)) {
    const error = new Error('验货结论不正确')
    error.code = 400
    throw error
  }

  const match = await findBatchPartById(batchPartId, auth)
  if (!match) {
    const error = new Error('验货对象不存在')
    error.code = 404
    throw error
  }

  const { batch, part, partIndex } = match
  if (part.status !== 'PENDING_INSPECTION') {
    const error = new Error('当前状态不允许提交验货结果')
    error.code = 409
    throw error
  }

  const baseQty = Number(part.actual_qty || part.planned_qty || 0)
  let normalizedQualifiedQty = Number(qualifiedQty != null ? qualifiedQty : baseQty)
  let normalizedDefectQty = Number(defectQty != null ? defectQty : Math.max(baseQty - normalizedQualifiedQty, 0))

  if (normalizedResult === 'PASS') {
    normalizedQualifiedQty = baseQty
    normalizedDefectQty = 0
  } else if (normalizedResult === 'FAIL') {
    normalizedQualifiedQty = 0
    normalizedDefectQty = defectQty != null ? Number(defectQty) : baseQty
  }

  if (normalizedQualifiedQty < 0 || normalizedDefectQty < 0) {
    const error = new Error('合格数和次品数不能为负数')
    error.code = 400
    throw error
  }

  if (normalizedQualifiedQty + normalizedDefectQty > baseQty) {
    const error = new Error('合格数与次品数之和不能超过已生产数量')
    error.code = 400
    throw error
  }

  const now = new Date().toISOString()
  const record = {
    batch_part_id: batchPartId,
    batch_id: batch._id,
    assembly_order_id: null,
    target_type: 'part',
    target_name: part.part_name || '',
    inspector_id: auth.user_id,
    assignee_id: auth.user_id,
    result: normalizedResult,
    qualified_qty: normalizedQualifiedQty,
    defect_qty: normalizedDefectQty,
    defect_desc: defectDesc || '',
    note: note || '',
    defects: (Array.isArray(defects) ? defects : []).map((item, index) => ({
      defect_id: item.defect_id || `df_${Date.now()}_${index}`,
      photo_file_id: item.photo_file_id || '',
      media_type: item.media_type === 'video' ? 'video' : 'image',
      file_name: item.file_name || '',
      description: item.description || ''
    })),
    inspected_at: now,
    created_at: now
  }

  const addResult = await getCollection(COLLECTION).add({ data: record })

  const nextStatus = normalizedResult === 'FAIL' ? 'PENDING_INSPECTION' : 'PENDING_SHIPMENT'
  const nextParts = [...(batch.parts || [])]
  nextParts[partIndex] = {
    ...part,
    actual_qty: normalizedQualifiedQty,
    status: nextStatus,
    status_updated_at: now
  }

  await getCollection(BATCHES_COLLECTION).doc(batch._id).update({
    data: {
      parts: nextParts
    }
  })

  return {
    inspectionId: addResult._id,
    batchPartId,
    result: normalizedResult,
    currentStatus: nextStatus
  }
}

async function getLatestInspectionMap(batchPartIds) {
  const ids = Array.from(new Set(batchPartIds.filter(Boolean)))
  if (ids.length === 0) {
    return {}
  }

  const _ = command
  const records = []
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100)
    const result = await getCollection(COLLECTION)
      .where({
        batch_part_id: _.in(chunk)
      })
      .get()
    records.push(...result.data)
  }

  return records.reduce((acc, item) => {
    const current = acc[item.batch_part_id]
    if (!current || `${item.inspected_at || ''}` > `${current.inspected_at || ''}`) {
      acc[item.batch_part_id] = item
    }
    return acc
  }, {})
}

function buildTargetRow(batch, part) {
  return {
    batchPartId: part.part_id,
    batchId: batch._id,
    batchNo: batch.batch_no,
    contractId: batch.contract_id,
    contractNo: batch.contract_no,
    supplierOrgId: batch.supplier_org_id,
    supplierName: batch.supplier_name,
    plannedDate: batch.planned_date,
    partName: part.part_name,
    plannedQty: Number(part.planned_qty || 0),
    actualQty: Number(part.actual_qty || 0),
    currentStatus: part.status,
    statusUpdatedAt: part.status_updated_at || '',
    note: batch.note || ''
  }
}

function buildDisplayStatus(currentStatus, inspectionResult) {
  if (currentStatus === 'PENDING_INSPECTION' && inspectionResult === 'FAIL') {
    return 'FAILED'
  }
  if (currentStatus === 'PENDING_INSPECTION') {
    return 'PENDING_INSPECTION'
  }
  if (currentStatus === 'PENDING_SHIPMENT') {
    return inspectionResult || 'PASS'
  }
  return currentStatus
}

module.exports = {
  'inspection.list': list,
  'inspection.create': create
}
