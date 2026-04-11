const { getCollection } = require('../config/database')
const { ensureAdmin, ensureOrgAccess } = require('../utils/access')
const { ensureContractDocument } = require('../utils/contract-document')

const COLLECTION = 'delivery_batches'
const CONTRACTS_COLLECTION = 'contracts'
const ORGS_COLLECTION = 'organizations'

async function list({ params, auth }) {
  const { contractId } = params
  if (!contractId) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const contractResult = await getCollection(CONTRACTS_COLLECTION).doc(contractId).get()
  if (!contractResult.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  ensureOrgAccess(auth, contractResult.data.supplier_org_id, '无权查看该合同批次')

  let result = await getAllDocumentsFromQuery(
    getCollection(COLLECTION)
      .where({ contract_id: contractId })
      .orderBy('batch_no', 'asc')
  )

  if (result.length === 0 && ['SIGNED', 'EXECUTING'].includes(contractResult.data.status)) {
    result = await autoBackfillBatches(contractResult.data)
  }

  return { list: result }
}

async function create({ params, auth }) {
  ensureAdmin(auth)
  const { contractId, planned_date, note, parts } = params
  if (!contractId) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }
  if (!planned_date) {
    const error = new Error('缺少计划交付日期')
    error.code = 400
    throw error
  }
  if (!Array.isArray(parts) || parts.length === 0) {
    const error = new Error('缺少批次配件明细')
    error.code = 400
    throw error
  }

  // Verify contract exists and status allows adding batches
  const contractResult = await getCollection(CONTRACTS_COLLECTION).doc(contractId).get()
  if (!contractResult.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  const contract = contractResult.data
  const allowedStatuses = ['DRAFT', 'PENDING_SIGN', 'SIGNED', 'EXECUTING']
  if (!allowedStatuses.includes(contract.status)) {
    const error = new Error('当前合同状态不允许添加交付批次')
    error.code = 400
    throw error
  }

  // Determine batch_no (next sequence)
  const existingBatches = await getCollection(COLLECTION)
    .where({ contract_id: contractId })
    .orderBy('batch_no', 'desc')
    .limit(1)
    .get()

  const nextBatchNo = existingBatches.data.length > 0
    ? (existingBatches.data[0].batch_no || 0) + 1
    : 1

  const now = new Date().toISOString()

  // Build parts array with status
  const batchParts = parts.map((part, index) => ({
    part_id: `bp_${Date.now()}_${index}`,
    part_type_id: part.part_type_id,
    part_name: part.part_name || '',
    planned_qty: part.planned_qty || 0,
    actual_qty: 0,
    status: 'PENDING_PRODUCTION',
    status_updated_at: null
  }))

  const batchDoc = {
    contract_id: contractId,
    contract_no: contract.contract_no || '',
    supplier_org_id: contract.supplier_org_id || '',
    supplier_name: contract.supplier_name || '',
    batch_no: nextBatchNo,
    planned_date,
    note: note || '',
    parts: batchParts,
    created_at: now
  }

  const addResult = await getCollection(COLLECTION).add({ data: batchDoc })

  // If contract is SIGNED, transition to EXECUTING
  if (contract.status === 'SIGNED') {
    await getCollection(CONTRACTS_COLLECTION).doc(contractId).update({
      data: {
        status: 'EXECUTING',
        updated_at: now
      }
    })
  }

  return { _id: addResult._id, ...batchDoc }
}

async function update({ params, auth }) {
  ensureAdmin(auth)
  const { id, _id, contract_id, contract_no, supplier_org_id, supplier_name, created_at, ...updates } = params
  if (!id) {
    const error = new Error('缺少批次 ID')
    error.code = 400
    throw error
  }

  const existing = await getCollection(COLLECTION).doc(id).get()
  if (!existing.data) {
    const error = new Error('批次不存在')
    error.code = 404
    throw error
  }

  // Only allow updating planned_date, note, and parts quantities
  const allowedFields = {}
  if (updates.planned_date !== undefined) allowedFields.planned_date = updates.planned_date
  if (updates.note !== undefined) allowedFields.note = updates.note
  if (Array.isArray(updates.parts)) {
    // Validate: only allow updating planned_qty for parts still in PENDING_PRODUCTION
    const currentParts = existing.data.parts || []
    const updatedParts = currentParts.map(currentPart => {
      const newPart = updates.parts.find(p => p.part_id === currentPart.part_id)
      if (newPart && currentPart.status === 'PENDING_PRODUCTION') {
        return {
          ...currentPart,
          planned_qty: newPart.planned_qty !== undefined ? newPart.planned_qty : currentPart.planned_qty,
          part_name: newPart.part_name !== undefined ? newPart.part_name : currentPart.part_name
        }
      }
      return currentPart
    })
    allowedFields.parts = updatedParts
  }

  if (Object.keys(allowedFields).length === 0) {
    return existing.data
  }

  await getCollection(COLLECTION).doc(id).update({ data: allowedFields })

  const result = await getCollection(COLLECTION).doc(id).get()
  return result.data
}

async function deleteBatch({ params, auth }) {
  ensureAdmin(auth)
  const { id } = params
  if (!id) {
    const error = new Error('缺少批次 ID')
    error.code = 400
    throw error
  }

  const existing = await getCollection(COLLECTION).doc(id).get()
  if (!existing.data) {
    const error = new Error('批次不存在')
    error.code = 404
    throw error
  }

  // Only allow deletion if all parts are PENDING_PRODUCTION
  const parts = existing.data.parts || []
  const allPending = parts.every(p => p.status === 'PENDING_PRODUCTION')
  if (!allPending) {
    const error = new Error('只能删除所有配件都处于"待生产"状态的批次')
    error.code = 400
    throw error
  }

  await getCollection(COLLECTION).doc(id).remove()
  return { success: true }
}

async function getAllDocumentsFromQuery(query, pageSize = 100) {
  const documents = []
  let offset = 0

  while (true) {
    const result = await query
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

async function autoBackfillBatches(contract) {
  const supplier = await loadSupplier(contract.supplier_org_id)
  const normalizedContract = ensureContractDocument(contract, supplier)
  const batchDocs = buildAutoGeneratedBatches(contract, normalizedContract, new Date().toISOString())

  if (batchDocs.length === 0) {
    return []
  }

  for (const batchDoc of batchDocs) {
    await getCollection(COLLECTION).add({ data: batchDoc })
  }

  if (contract.status === 'SIGNED') {
    await getCollection(CONTRACTS_COLLECTION).doc(contract._id).update({
      data: {
        status: 'EXECUTING',
        updated_at: new Date().toISOString()
      }
    })
  }

  return getAllDocumentsFromQuery(
    getCollection(COLLECTION)
      .where({ contract_id: contract._id })
      .orderBy('batch_no', 'asc')
  )
}

async function loadSupplier(orgId) {
  if (!orgId) {
    return null
  }

  try {
    const result = await getCollection(ORGS_COLLECTION).doc(orgId).get()
    return result.data || null
  } catch (error) {
    return null
  }
}

function buildAutoGeneratedBatches(contract, normalizedContract, now) {
  const deliveryRows = Array.isArray(normalizedContract.delivery_rows) ? normalizedContract.delivery_rows : []
  const productItems = Array.isArray(normalizedContract.product_items) ? normalizedContract.product_items : []
  const batchDocs = []

  deliveryRows.forEach((row, rowIndex) => {
    const plannedDate = normalizePlannedDate(row.date)
    const parts = productItems
      .map((item, itemIndex) => ({
        part_id: `bp_${row.row_id || rowIndex + 1}_${itemIndex + 1}`,
        part_type_id: item.part_type_id || '',
        part_name: item.part_name || item.model || '',
        planned_qty: Number(row.qtys?.[item.row_id] || 0),
        actual_qty: 0,
        status: 'PENDING_PRODUCTION',
        status_updated_at: null
      }))
      .filter((part) => part.planned_qty > 0)

    if (parts.length === 0 || !plannedDate) {
      return
    }

    batchDocs.push({
      contract_id: contract._id,
      contract_no: contract.contract_no || '',
      supplier_org_id: contract.supplier_org_id || '',
      supplier_name: contract.supplier_name || '',
      batch_no: batchDocs.length + 1,
      planned_date: plannedDate,
      note: '',
      parts,
      created_at: now
    })
  })

  return batchDocs
}

function normalizePlannedDate(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  const normalized = raw.replace(/[./]/g, '-').replace(/\s+/g, '')
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return ''
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString().slice(0, 10)
}

module.exports = {
  'batch.list': list,
  'batch.create': create,
  'batch.update': update,
  'batch.delete': deleteBatch
}
