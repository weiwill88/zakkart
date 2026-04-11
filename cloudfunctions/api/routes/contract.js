const cloud = require('wx-server-sdk')
const { getCollection, command, createKeywordRegExp } = require('../config/database')
const { ensureAdmin, ensureOrgAccess, isSupplierRole, ensureSupplierOrAdmin } = require('../utils/access')
const { createBuyerInfo, ensureContractDocument } = require('../utils/contract-document')

const COLLECTION = 'contracts'
const ORGS_COLLECTION = 'organizations'
const BATCHES_COLLECTION = 'delivery_batches'

async function list({ params, auth }) {
  const { page = 1, pageSize = 20, keyword, status, supplierOrgId, productId } = params
  const col = getCollection(COLLECTION)
  const _ = command

  const conditions = []

  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { contract_no: keywordRegExp },
      { supplier_name: keywordRegExp },
      { product_name: keywordRegExp }
    ]))
  }
  if (status) {
    conditions.push({ status })
  }
  if (supplierOrgId) {
    conditions.push({ supplier_org_id: supplierOrgId })
  }
  if (productId) {
    conditions.push({ product_id: productId })
  }
  if (isSupplierRole(auth?.role) && auth.org_id) {
    conditions.push({ supplier_org_id: auth.org_id })
  }

  const whereClause = conditions.length > 0
    ? col.where(_.and(conditions))
    : col

  const countResult = await whereClause.count()
  const total = countResult.total

  const skip = (page - 1) * pageSize
  const listResult = await whereClause
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    list: listResult.data,
    total,
    page,
    pageSize
  }
}

async function detail({ params, auth }) {
  const { id } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  if (!result.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  ensureOrgAccess(auth, result.data.supplier_org_id, '无权查看该合同')

  const supplier = await loadSupplier(result.data.supplier_org_id)

  return {
    ...result.data,
    supplier_legal_person: result.data.supplier_legal_person || supplier?.legal_person || '',
    supplier_credit_code: result.data.supplier_credit_code || supplier?.credit_code || '',
    supplier_address: result.data.supplier_address || supplier?.address || '',
    supplier_phone: result.data.supplier_phone || supplier?.contact_phone || '',
    supplier_bank_name: result.data.supplier_bank_name || supplier?.bank_info?.bank_name || '',
    supplier_bank_account: result.data.supplier_bank_account || supplier?.bank_info?.bank_account || '',
    supplier_bank_branch: result.data.supplier_bank_branch || supplier?.bank_info?.bank_branch || '',
    ...ensureContractDocument(result.data, supplier)
  }
}

async function update({ params, auth }) {
  ensureAdmin(auth)
  const { id, _id, created_at, created_by, ...updates } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const existing = await getCollection(COLLECTION).doc(id).get()
  if (!existing.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  const currentStatus = existing.data.status
  if (currentStatus !== 'DRAFT' && currentStatus !== 'PENDING_SIGN') {
    const error = new Error('只有草稿或待签署状态的合同可以编辑')
    error.code = 400
    throw error
  }

  if (updates.buyer_info) {
    updates.buyer_info = createBuyerInfo(updates.buyer_info)
  }

  if (updates.raw_materials !== undefined) {
    updates.raw_materials = String(updates.raw_materials || '').trim()
  }

  // Recalculate total_amount if items are updated
  if (updates.items) {
    updates.total_amount = updates.items.reduce((sum, item) => {
      return sum + (item.amount || (item.quantity * (item.unit_price || 0)))
    }, 0)
  } else if (updates.product_items) {
    updates.total_amount = updates.product_items.reduce((sum, item) => {
      const qty = Number(item.total_qty || 0)
      const price = Number(item.unit_price || 0)
      return sum + (qty * price)
    }, 0)
  }

  updates.updated_at = new Date().toISOString()

  await getCollection(COLLECTION).doc(id).update({ data: updates })

  const result = await getCollection(COLLECTION).doc(id).get()
  return result.data
}

async function exportWord({ params, auth }) {
  ensureAdmin(auth)
  const { id, wordFileId } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const contractResult = await getCollection(COLLECTION).doc(id).get()
  if (!contractResult.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  const supplier = await loadSupplier(contractResult.data.supplier_org_id)
  const contract = {
    ...contractResult.data,
    supplier_legal_person: contractResult.data.supplier_legal_person || supplier?.legal_person || '',
    supplier_credit_code: contractResult.data.supplier_credit_code || supplier?.credit_code || '',
    supplier_address: contractResult.data.supplier_address || supplier?.address || '',
    supplier_phone: contractResult.data.supplier_phone || supplier?.contact_phone || '',
    supplier_bank_name: contractResult.data.supplier_bank_name || supplier?.bank_info?.bank_name || '',
    supplier_bank_account: contractResult.data.supplier_bank_account || supplier?.bank_info?.bank_account || '',
    supplier_bank_branch: contractResult.data.supplier_bank_branch || supplier?.bank_info?.bank_branch || '',
    ...ensureContractDocument(contractResult.data, supplier)
  }

  const updateData = { updated_at: new Date().toISOString() }
  if (contract.supplier_confirm_status !== 'CONFIRMED') {
    updateData.supplier_confirm_status = contract.supplier_confirm_status || 'UNSENT'
  }
  if (wordFileId) {
    updateData.word_file_id = wordFileId
  }

  if (wordFileId) {
    await getCollection(COLLECTION).doc(id).update({ data: updateData })
  }

  // Fetch delivery batches for this contract
  const batchResult = await getAllDocumentsFromQuery(
    getCollection(BATCHES_COLLECTION).where({ contract_id: id })
  )

  return {
    contract: { ...contract, ...updateData },
    supplier,
    batches: batchResult
  }
}

async function pushConfirm({ params, auth }) {
  ensureAdmin(auth)
  const { id } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const contractResult = await getCollection(COLLECTION).doc(id).get()
  if (!contractResult.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  const contract = contractResult.data
  if (!['DRAFT', 'PENDING_SIGN'].includes(contract.status)) {
    const error = new Error('当前合同状态不允许发起供应商确认')
    error.code = 409
    throw error
  }

  const now = new Date().toISOString()
  const updateData = {
    status: 'PENDING_SIGN',
    supplier_confirm_status: contract.supplier_confirm_status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_CONFIRM',
    updated_at: now
  }

  await getCollection(COLLECTION).doc(id).update({ data: updateData })

  return {
    contractId: id,
    status: updateData.status,
    supplierConfirmStatus: updateData.supplier_confirm_status,
    updatedAt: now
  }
}

async function uploadSigned({ params, auth }) {
  ensureAdmin(auth)
  const { id, signedPdfFileId } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }
  if (!signedPdfFileId) {
    const error = new Error('缺少已签署 PDF 文件 ID')
    error.code = 400
    throw error
  }

  const contractResult = await getCollection(COLLECTION).doc(id).get()
  if (!contractResult.data) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  const contract = contractResult.data
  if (contract.status !== 'DRAFT' && contract.status !== 'PENDING_SIGN') {
    const error = new Error('只有草稿或待签署状态的合同可以上传签署文件')
    error.code = 400
    throw error
  }

  // Check if contract has delivery batches
  const batchCount = await getCollection(BATCHES_COLLECTION).where({ contract_id: id }).count()
  const hasBatches = batchCount.total > 0

  const org = await loadSupplier(contract.supplier_org_id)
  const normalizedContract = ensureContractDocument(contract, org)
  const snapshot = org
    ? {
        supplier_name: org.name || '',
        supplier_credit_code: contract.supplier_credit_code || org.credit_code || '',
        supplier_legal_person: contract.supplier_legal_person || org.legal_person || '',
        buyer_info: normalizedContract.buyer_info,
        contract_terms: {
          product_desc: normalizedContract.product_desc,
          raw_materials: normalizedContract.raw_materials,
          product_items: normalizedContract.product_items,
          delivery_rows: normalizedContract.delivery_rows,
          clause_sections: normalizedContract.clause_sections
        },
        snapshot_at: new Date().toISOString()
      }
    : null

  const now = new Date().toISOString()
  const newStatus = hasBatches ? 'EXECUTING' : 'SIGNED'

  const updateData = {
    signed_pdf_file_id: signedPdfFileId,
    signed_at: now,
    status: newStatus,
    supplier_confirm_status: 'CONFIRMED',
    supplier_confirmed_at: contract.supplier_confirmed_at || now,
    supplier_confirmed_by: contract.supplier_confirmed_by || auth.user_id || '',
    updated_at: now
  }

  if (contract.snapshot === null) {
    await getCollection(COLLECTION).doc(id).update({
      data: {
        snapshot: command.remove()
      }
    })
  }

  if (snapshot) {
    updateData.snapshot = snapshot
  }

  await getCollection(COLLECTION).doc(id).update({ data: updateData })

  return {
    contractId: id,
    status: newStatus,
    signedPdfFileId,
    signedAt: now
  }
}

async function confirm({ params, auth }) {
  ensureSupplierOrAdmin(auth)
  const { id } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  const contract = result.data
  if (!contract) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  ensureOrgAccess(auth, contract.supplier_org_id, '无权确认该合同')

  if (contract.status !== 'PENDING_SIGN') {
    const error = new Error('当前合同状态不允许在线确认')
    error.code = 409
    throw error
  }

  if (contract.supplier_confirm_status === 'CONFIRMED') {
    return {
      contractId: id,
      supplierConfirmStatus: 'CONFIRMED',
      supplierConfirmedAt: contract.supplier_confirmed_at || ''
    }
  }

  const now = new Date().toISOString()
  await getCollection(COLLECTION).doc(id).update({
    data: {
      supplier_confirm_status: 'CONFIRMED',
      supplier_confirmed_at: now,
      supplier_confirmed_by: auth.user_id || '',
      updated_at: now
    }
  })

  return {
    contractId: id,
    supplierConfirmStatus: 'CONFIRMED',
    supplierConfirmedAt: now
  }
}

async function getSignedPdfUrl({ params, auth }) {
  ensureSupplierOrAdmin(auth)
  const { id } = params
  if (!id) {
    const error = new Error('缺少合同 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  const contract = result.data
  if (!contract) {
    const error = new Error('合同不存在')
    error.code = 404
    throw error
  }

  ensureOrgAccess(auth, contract.supplier_org_id, '无权查看该合同文件')

  if (!contract.signed_pdf_file_id) {
    const error = new Error('暂无已签 PDF')
    error.code = 404
    throw error
  }

  const tempResult = await cloud.getTempFileURL({
    fileList: [{
      fileID: contract.signed_pdf_file_id,
      maxAge: 3600
    }]
  })
  const fileItem = (tempResult.fileList || []).find(item => {
    return (item.fileID || item.fileId) === contract.signed_pdf_file_id
  })
  const tempUrl = fileItem?.tempFileURL || fileItem?.download_url || fileItem?.tempFileUrl || ''

  if (fileItem?.status && fileItem.status !== 0) {
    const error = new Error(fileItem.errMsg || '文件地址获取失败')
    error.code = 500
    throw error
  }

  if (!tempUrl) {
    const error = new Error('文件地址获取失败')
    error.code = 500
    throw error
  }

  return {
    fileId: contract.signed_pdf_file_id,
    tempUrl
  }
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

async function create({ params, auth }) {
  ensureAdmin(auth)
  const now = new Date().toISOString()
  const supplierBankName = params.supplier_bank_name || params.bank_name || ''
  const supplierBankAccount = params.supplier_bank_account || params.bank_account || ''
  const supplierBankBranch = params.supplier_bank_branch || params.bank_branch || ''

  const doc = {
    contract_no: params.contract_no || '',
    supplier_org_id: params.supplier_org_id || '',
    supplier_name: params.supplier_name || '',
    product_id: params.product_id || '',
    product_name: params.product_name || '',
    status: 'DRAFT',
    total_amount: params.total_amount || 0,
    deposit_ratio: params.deposit_ratio != null ? params.deposit_ratio : 0.30,
    final_ratio: params.final_ratio != null ? params.final_ratio : 0.70,
    word_file_id: '',
    signed_pdf_file_id: '',
    signed_at: null,
    supplier_confirm_status: 'UNSENT',
    supplier_confirmed_at: '',
    supplier_confirmed_by: '',
    created_by: auth ? auth.userId : '',
    items: Array.isArray(params.items) ? params.items : [],
    // Extended fields for contract document
    buyer_info: createBuyerInfo(params.buyer_info || {}),
    supplier_legal_person: params.supplier_legal_person || '',
    supplier_credit_code: params.supplier_credit_code || '',
    supplier_address: params.supplier_address || '',
    supplier_phone: params.supplier_phone || '',
    supplier_bank_name: supplierBankName,
    supplier_bank_account: supplierBankAccount,
    supplier_bank_branch: supplierBankBranch,
    product_desc: params.product_desc || '',
    raw_materials: params.raw_materials || '',
    product_items: Array.isArray(params.product_items) ? params.product_items : [],
    delivery_rows: Array.isArray(params.delivery_rows) ? params.delivery_rows : [],
    clause_sections: params.clause_sections || {},
    created_at: now,
    updated_at: now
  }

  const result = await getCollection(COLLECTION).add({ data: doc })
  return { _id: result._id, ...doc }
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

module.exports = {
  'contract.list': list,
  'contract.detail': detail,
  'contract.create': create,
  'contract.update': update,
  'contract.exportWord': exportWord,
  'contract.pushConfirm': pushConfirm,
  'contract.uploadSigned': uploadSigned,
  'contract.confirm': confirm,
  'contract.getSignedPdfUrl': getSignedPdfUrl
}
