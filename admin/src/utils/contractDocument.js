function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function createEmptyProductItem() {
  return {
    item_type: 'product',
    row_id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    part_type_id: '',
    part_name: '',
    model: '',
    size: '',
    material: '',
    weight: '',
    color: '',
    qty_detail: '',
    total_qty: 0,
    unit_price: null,
    source_item_ids: []
  }
}

export function createEmptyFeeItem() {
  return {
    item_type: 'fee',
    row_id: `fee_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    part_type_id: '',
    part_name: '一次性费用',
    model: '一次性费用',
    size: '',
    material: '',
    weight: '',
    color: '',
    qty_detail: '',
    total_qty: 1,
    unit_price: 0,
    source_item_ids: []
  }
}

export function ensureContractShape(contractDraft) {
  if (!contractDraft.buyerInfo) {
    contractDraft.buyerInfo = {}
  }
  if (!Array.isArray(contractDraft.productItems)) {
    contractDraft.productItems = []
  }
  if (!Array.isArray(contractDraft.deliveryRows)) {
    contractDraft.deliveryRows = []
  }
  if (!contractDraft.clauseSections) {
    contractDraft.clauseSections = {}
  }
  if (!Array.isArray(contractDraft.appendixImages)) {
    contractDraft.appendixImages = []
  }

  contractDraft.clauseSections = {
    preamble: '',
    quality_clause: '',
    variation_clause: '',
    delivery_clause: '',
    quality_guarantee_clause: '',
    payment_ratio_deposit: 30,
    payment_ratio_final: 70,
    payment_account_name: contractDraft.bankName || '',
    payment_bank_name: contractDraft.bankBranch || '',
    payment_bank_account: contractDraft.bankAccount || '',
    payment_bank_branch: contractDraft.bankBranch || '',
    payment_clause: '',
    invoice_clause: '',
    section6_text: '',
    section7_text: '',
    section8_text: '',
    section9_text: '',
    ...contractDraft.clauseSections
  }

  contractDraft.productItems = (contractDraft.productItems || []).map(normalizeProductItem)
  contractDraft.deliveryRows = syncDeliveryRows(getDeliverableProductItems(contractDraft.productItems), contractDraft.deliveryRows)
  if (!contractDraft.deliveryRows.length && getDeliverableProductItems(contractDraft.productItems).length) {
    contractDraft.deliveryRows.push(createEmptyDeliveryRow(contractDraft.productItems))
  }
}

export function createEmptyDeliveryRow(productItems = []) {
  const qtys = {}
  getDeliverableProductItems(productItems).forEach((item) => {
    qtys[item.row_id] = 0
  })

  return {
    row_id: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: '',
    qtys
  }
}

export function syncDeliveryRows(productItems = [], deliveryRows = []) {
  const deliverableItems = getDeliverableProductItems(productItems)
  return (deliveryRows || []).map((row) => {
    const qtys = {}
    deliverableItems.forEach((item) => {
      qtys[item.row_id] = Number(row.qtys?.[item.row_id] || 0)
    })

    return {
      row_id: row.row_id || `dr_${Date.now()}`,
      date: row.date || '',
      qtys
    }
  })
}

export function createContractDraftFromGenerated(contract) {
  const clauseSections = normalizeClauseSections(contract.clauseSections || {})
  const accountName = contract.bankInfo?.account_name || contract.supplierName || ''
  const bankName = contract.bankInfo?.bank_name || contract.bankInfo?.bank_branch || ''
  return {
    orgId: contract.supplierOrgId,
    contractId: contract.contractId,
    contractNo: contract.contractNo,
    supplierName: contract.supplierName || '',
    legalPerson: contract.legalPerson || '',
    creditCode: contract.creditCode || '',
    address: contract.address || '',
    phone: contract.phone || '',
    bankName: accountName,
    bankAccount: contract.bankInfo?.bank_account || '',
    bankBranch: bankName,
    buyerInfo: clone(contract.buyerInfo || {}),
    productDesc: contract.productDesc || '',
    rawMaterials: contract.rawMaterials || '',
    productItems: clone(contract.productItems || []).map(normalizeProductItem),
    deliveryRows: clone(contract.deliveryRows || []),
    clauseSections,
    appendixImages: clone(contract.appendixImages || contract.appendix_images || []),
    _status: contract.status || 'DRAFT',
    _supplierConfirmStatus: contract.supplierConfirmStatus || 'UNSENT',
    _savedId: contract.contractId,
    _items: clone(contract.items || [])
  }
}

export function createContractDraftFromDetail(contract) {
  const clauseSections = normalizeClauseSections(contract.clause_sections || {})
  const accountName = contract.supplier_bank_account_name
    || contract.payment_account_name
    || clauseSections.payment_account_name
    || contract.supplier_name
    || ''
  const bankName = contract.supplier_bank_name
    || clauseSections.payment_bank_name
    || contract.supplier_bank_branch
    || ''
  return {
    contractId: contract._id,
    contractNo: contract.contract_no || '',
    supplierName: contract.supplier_name || '',
    legalPerson: contract.supplier_legal_person || '',
    creditCode: contract.supplier_credit_code || '',
    address: contract.supplier_address || '',
    phone: contract.supplier_phone || '',
    bankName: accountName,
    bankAccount: contract.supplier_bank_account || '',
    bankBranch: bankName,
    buyerInfo: clone(contract.buyer_info || {}),
    productDesc: contract.product_desc || '',
    rawMaterials: contract.raw_materials || '',
    productItems: clone(contract.product_items || []).map(normalizeProductItem),
    deliveryRows: clone(contract.delivery_rows || []),
    clauseSections,
    appendixImages: clone(contract.appendix_images || contract.attachment_images || []),
    _status: contract.status || 'DRAFT',
    _supplierConfirmStatus: contract.supplier_confirm_status || 'UNSENT',
    _savedId: contract._id,
    _items: clone(contract.items || [])
  }
}

export function removeProductItem(contractDraft, rowId) {
  const target = (contractDraft.productItems || []).find(item => item.row_id === rowId)
  const sourceIds = Array.isArray(target?.source_item_ids) ? target.source_item_ids : []
  contractDraft.productItems = (contractDraft.productItems || []).filter(item => item.row_id !== rowId)
  contractDraft.deliveryRows = syncDeliveryRows(getDeliverableProductItems(contractDraft.productItems), contractDraft.deliveryRows)
  if (sourceIds.length > 0) {
    contractDraft._items = (contractDraft._items || []).filter(item => !sourceIds.includes(item.item_id))
  }
}

export function ensureDeliveryRows(contractDraft) {
  contractDraft.deliveryRows = syncDeliveryRows(getDeliverableProductItems(contractDraft.productItems), contractDraft.deliveryRows)
  if (!contractDraft.deliveryRows.length) {
    contractDraft.deliveryRows.push(createEmptyDeliveryRow(contractDraft.productItems))
  }
}

export function calcProductItemAmount(item) {
  const qty = isFeeItem(item) ? 1 : Number(item.total_qty || 0)
  const price = Number(item.unit_price || 0)
  return qty * price
}

export function calcContractGrandTotal(contractDraft) {
  return (contractDraft.productItems || []).reduce((sum, item) => sum + calcProductItemAmount(item), 0)
}

export function calcDeliveryRowTotal(row) {
  return Object.values(row.qtys || {}).reduce((sum, value) => sum + Number(value || 0), 0)
}

export function calcDeliveryColTotal(contractDraft, rowId) {
  return (contractDraft.deliveryRows || []).reduce((sum, row) => sum + Number(row.qtys?.[rowId] || 0), 0)
}

export function calcDeliveryGrandTotal(contractDraft) {
  return (contractDraft.deliveryRows || []).reduce((sum, row) => sum + calcDeliveryRowTotal(row), 0)
}

export function buildContractUpdatePayload(contractDraft) {
  ensureContractShape(contractDraft)
  validateDeliveryTotals(contractDraft)

  const productItems = (contractDraft.productItems || []).map(item => ({
    item_type: isFeeItem(item) ? 'fee' : 'product',
    row_id: item.row_id,
    part_type_id: item.part_type_id || '',
    part_name: item.part_name || item.model || '',
    model: item.model || item.part_name || '',
    size: item.size || '',
    material: item.material || '',
    weight: item.weight || '',
    color: item.color || '',
    qty_detail: '',
    total_qty: isFeeItem(item) ? 1 : Number(item.total_qty || 0),
    unit_price: item.unit_price === '' || item.unit_price === null || item.unit_price === undefined
      ? null
      : Number(item.unit_price || 0),
    source_item_ids: Array.isArray(item.source_item_ids) ? item.source_item_ids : []
  }))

  const removedIds = new Set()
  productItems.forEach((item) => {
    ;(item.source_item_ids || []).forEach((id) => removedIds.add(id))
  })

  const items = (contractDraft._items || [])
    .filter(item => removedIds.has(item.item_id))
    .map((item) => {
      const productItem = productItems.find(entry => (entry.source_item_ids || []).includes(item.item_id))
      const fallbackUnitPrice = productItem?.unit_price != null ? Number(productItem.unit_price) : Number(item.unit_price || 0)
      return {
        ...item,
        unit_price: fallbackUnitPrice,
        amount: Number(item.quantity || 0) * fallbackUnitPrice
      }
    })

  return {
    contract_no: contractDraft.contractNo,
    total_amount: calcContractGrandTotal({ productItems }),
    deposit_ratio: parseRatio(contractDraft.clauseSections?.payment_ratio_deposit, 0.3),
    final_ratio: parseRatio(contractDraft.clauseSections?.payment_ratio_final, 0.7),
    items,
    buyer_info: clone(contractDraft.buyerInfo || {}),
    supplier_legal_person: contractDraft.legalPerson,
    supplier_credit_code: contractDraft.creditCode,
    supplier_address: contractDraft.address,
    supplier_phone: contractDraft.phone,
    supplier_bank_account_name: contractDraft.bankName,
    supplier_bank_name: contractDraft.bankBranch,
    supplier_bank_account: contractDraft.bankAccount,
    supplier_bank_branch: contractDraft.bankBranch,
    product_desc: contractDraft.productDesc,
    raw_materials: contractDraft.rawMaterials,
    product_items: productItems,
    delivery_rows: syncDeliveryRows(getDeliverableProductItems(productItems), contractDraft.deliveryRows),
    clause_sections: sanitizeClauseSections(contractDraft.clauseSections, contractDraft),
    appendix_images: clone(contractDraft.appendixImages || [])
  }
}

function parseRatio(value, fallback) {
  const number = Number(value)
  if (Number.isNaN(number)) {
    return fallback
  }

  if (number > 1) {
    return Number((number / 100).toFixed(2))
  }

  return number
}

function sanitizeClauseSections(sections = {}, contractDraft = {}) {
  const sanitized = {
    ...clone(sections),
    payment_ratio_deposit: parseRatio(sections.payment_ratio_deposit, 0.3),
    payment_ratio_final: parseRatio(sections.payment_ratio_final, 0.7),
    payment_account_name: contractDraft.bankName || '',
    payment_bank_name: contractDraft.bankBranch || '',
    payment_bank_account: contractDraft.bankAccount || '',
    payment_bank_branch: contractDraft.bankBranch || ''
  }
  sanitized.payment_clause = buildPaymentClause(sanitized, contractDraft)
  return sanitized
}

function normalizeClauseSections(sections = {}) {
  const cloned = clone(sections)
  if (cloned.payment_ratio_deposit !== undefined) {
    const deposit = Number(cloned.payment_ratio_deposit)
    cloned.payment_ratio_deposit = !Number.isNaN(deposit) && deposit <= 1 ? deposit * 100 : deposit
  }
  if (cloned.payment_ratio_final !== undefined) {
    const final = Number(cloned.payment_ratio_final)
    cloned.payment_ratio_final = !Number.isNaN(final) && final <= 1 ? final * 100 : final
  }
  return cloned
}

export function isFeeItem(item = {}) {
  return item.item_type === 'fee'
}

export function getDeliverableProductItems(productItems = []) {
  return (productItems || []).filter(item => !isFeeItem(item))
}

export function validateDeliveryTotals(contractDraft = {}) {
  const errors = []
  getDeliverableProductItems(contractDraft.productItems || []).forEach((item) => {
    const expected = Number(item.total_qty || 0)
    const actual = calcDeliveryColTotal(contractDraft, item.row_id)
    if (expected !== actual) {
      errors.push(`${item.model || item.part_name || '未命名货物'}：采购数量 ${expected}，交付计划 ${actual}`)
    }
  })

  if (errors.length > 0) {
    const error = new Error(`交付计划数量必须与采购数量一致：${errors.join('；')}`)
    error.details = errors
    throw error
  }
}

function normalizeProductItem(item = {}) {
  const itemType = item.item_type === 'fee' ? 'fee' : 'product'
  return {
    item_type: itemType,
    row_id: item.row_id || `${itemType === 'fee' ? 'fee' : 'pi'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    part_type_id: item.part_type_id || '',
    part_name: item.part_name || item.model || '',
    model: item.model || item.part_name || '',
    size: item.size || '',
    material: item.material || '',
    weight: item.weight || '',
    color: item.color || '',
    qty_detail: '',
    total_qty: itemType === 'fee' ? Number(item.total_qty || 1) : Number(item.total_qty || 0),
    unit_price: item.unit_price === '' || item.unit_price === undefined ? null : item.unit_price,
    source_item_ids: Array.isArray(item.source_item_ids) ? item.source_item_ids : []
  }
}

function buildPaymentClause(sections = {}, contractDraft = {}) {
  const existing = String(sections.payment_clause || '')
  const isGenerated = existing.includes('乙方指定的收款账户信息如下')
  if (existing && !isGenerated) {
    return existing
  }

  const depositPercent = formatPercent(parseRatio(sections.payment_ratio_deposit, 0.3))
  const finalPercent = formatPercent(parseRatio(sections.payment_ratio_final, 0.7))
  return `甲方承诺在合同签署后，货物生产前将货物采购订金支付至乙方指定银行账户，采购订金为货物采购总金额的${depositPercent}%；乙方完成全部货物的生产后，甲方对乙方生产货物进行现场验收，并向乙方支付剩余${finalPercent}%的采购尾款，如甲方验收时发现不合格品，则不合格品的尾款待乙方完成返工并交付甲方后，由甲方立即支付给乙方。\n\n乙方指定的收款账户信息如下：\n户名：${contractDraft.bankName || '________'}\n账户号：${contractDraft.bankAccount || '________'}\n开户行：${contractDraft.bankBranch || '________'}`
}

function formatPercent(value) {
  return (Number(value || 0) * 100).toFixed(0)
}
