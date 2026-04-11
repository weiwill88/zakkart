function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function createEmptyProductItem() {
  return {
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

  contractDraft.clauseSections = {
    preamble: '',
    quality_clause: '',
    variation_clause: '',
    delivery_clause: '',
    quality_guarantee_clause: '',
    payment_ratio_deposit: 30,
    payment_ratio_final: 70,
    payment_bank_name: contractDraft.bankName || '',
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

  contractDraft.deliveryRows = syncDeliveryRows(contractDraft.productItems, contractDraft.deliveryRows)
  if (!contractDraft.deliveryRows.length && contractDraft.productItems.length) {
    contractDraft.deliveryRows.push(createEmptyDeliveryRow(contractDraft.productItems))
  }
}

export function createEmptyDeliveryRow(productItems = []) {
  const qtys = {}
  productItems.forEach((item) => {
    qtys[item.row_id] = 0
  })

  return {
    row_id: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: '',
    qtys
  }
}

export function syncDeliveryRows(productItems = [], deliveryRows = []) {
  return (deliveryRows || []).map((row) => {
    const qtys = {}
    productItems.forEach((item) => {
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
  return {
    orgId: contract.supplierOrgId,
    contractId: contract.contractId,
    contractNo: contract.contractNo,
    supplierName: contract.supplierName || '',
    legalPerson: contract.legalPerson || '',
    creditCode: contract.creditCode || '',
    address: contract.address || '',
    phone: contract.phone || '',
    bankName: contract.bankInfo?.bank_name || contract.supplierName || '',
    bankAccount: contract.bankInfo?.bank_account || '',
    bankBranch: contract.bankInfo?.bank_branch || '',
    buyerInfo: clone(contract.buyerInfo || {}),
    productDesc: contract.productDesc || '',
    rawMaterials: contract.rawMaterials || '',
    productItems: clone(contract.productItems || []),
    deliveryRows: clone(contract.deliveryRows || []),
    clauseSections,
    _status: contract.status || 'DRAFT',
    _supplierConfirmStatus: contract.supplierConfirmStatus || 'UNSENT',
    _savedId: contract.contractId,
    _items: clone(contract.items || [])
  }
}

export function createContractDraftFromDetail(contract) {
  const clauseSections = normalizeClauseSections(contract.clause_sections || {})
  return {
    contractId: contract._id,
    contractNo: contract.contract_no || '',
    supplierName: contract.supplier_name || '',
    legalPerson: contract.supplier_legal_person || '',
    creditCode: contract.supplier_credit_code || '',
    address: contract.supplier_address || '',
    phone: contract.supplier_phone || '',
    bankName: contract.supplier_bank_name || '',
    bankAccount: contract.supplier_bank_account || '',
    bankBranch: contract.supplier_bank_branch || '',
    buyerInfo: clone(contract.buyer_info || {}),
    productDesc: contract.product_desc || '',
    rawMaterials: contract.raw_materials || '',
    productItems: clone(contract.product_items || []),
    deliveryRows: clone(contract.delivery_rows || []),
    clauseSections,
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
  contractDraft.deliveryRows = syncDeliveryRows(contractDraft.productItems, contractDraft.deliveryRows)
  if (sourceIds.length > 0) {
    contractDraft._items = (contractDraft._items || []).filter(item => !sourceIds.includes(item.item_id))
  }
}

export function ensureDeliveryRows(contractDraft) {
  contractDraft.deliveryRows = syncDeliveryRows(contractDraft.productItems, contractDraft.deliveryRows)
  if (!contractDraft.deliveryRows.length) {
    contractDraft.deliveryRows.push(createEmptyDeliveryRow(contractDraft.productItems))
  }
}

export function calcProductItemAmount(item) {
  const qty = Number(item.total_qty || 0)
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
  const productItems = (contractDraft.productItems || []).map(item => ({
    row_id: item.row_id,
    part_type_id: item.part_type_id || '',
    part_name: item.part_name || item.model || '',
    model: item.model || item.part_name || '',
    size: item.size || '',
    material: item.material || '',
    weight: item.weight || '',
    color: item.color || '',
    qty_detail: item.qty_detail || '',
    total_qty: Number(item.total_qty || 0),
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
    supplier_bank_name: contractDraft.bankName,
    supplier_bank_account: contractDraft.bankAccount,
    supplier_bank_branch: contractDraft.bankBranch,
    product_desc: contractDraft.productDesc,
    raw_materials: contractDraft.rawMaterials,
    product_items: productItems,
    delivery_rows: syncDeliveryRows(productItems, contractDraft.deliveryRows),
    clause_sections: sanitizeClauseSections(contractDraft.clauseSections, contractDraft)
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
  return {
    ...clone(sections),
    payment_ratio_deposit: parseRatio(sections.payment_ratio_deposit, 0.3),
    payment_ratio_final: parseRatio(sections.payment_ratio_final, 0.7),
    payment_bank_name: contractDraft.bankName || '',
    payment_bank_account: contractDraft.bankAccount || '',
    payment_bank_branch: contractDraft.bankBranch || ''
  }
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
