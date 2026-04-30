function createBuyerInfo(overrides = {}) {
  return {
    name: '上海掇骁贸易有限公司',
    legal_person: '闵一',
    credit_code: '91310109MACHK7GN2R',
    address: '上海市虹口区同心路723号13幢5321室',
    phone: '13262515903',
    invoice_info: '名称：上海掇骁贸易有限公司\n税号：91310109MACHK7GN2R\n开户行：中信银行黄浦支行 8110201012001655475\n联系地址：上海市虹口区同心路723号13幢5321室 13917000290',
    ...overrides
  }
}

function createClauseSections({
  productDesc = '配件',
  rawMaterials = '',
  depositRatio = 0.3,
  finalRatio = 0.7,
  supplierAccountName = '',
  supplierBankName = '',
  supplierBankAccount = '',
  supplierBankBranch = ''
} = {}) {
  const depositPercent = formatPercent(depositRatio)
  const finalPercent = formatPercent(finalRatio)
  const accountName = String(supplierAccountName || '').trim()
  const bankName = String(supplierBankName || supplierBankBranch || '').trim()

  return {
    preamble: `经甲乙双方充分协商，根据《中华人民共和国合同法》及相关法律法规的有关规定，秉承公平、自愿、诚信的合作原则，就甲方向乙方采购${productDesc}产品用以生产组装宠物吊床产品的事宜，双方订立本采购合同，并承诺共同遵守。`,
    quality_clause: '乙方生产货物的各项尺寸需要同附录一的产品规格和尺寸说明相符且产品颜色需要同甲乙双方确认的产品的产前样色卡相符，同时成品货物不能出现缝合线开线、布料缝合处有毛边、产品本身不整洁、棉花填充不均匀不足量、布料克重材质不达标等明显的质量问题。',
    raw_materials_clause: rawMaterials || '________',
    variation_clause: '货物实际生产时，上述产品尺寸、规格、重量、颜色发生调整改动的以双方认同的产品产前样为准。',
    delivery_clause: '本合同约定的采购产品，乙方承诺按下面的交付计划表完成全部产品的生产和包装工序并可交付甲方提货；',
    quality_guarantee_clause: '如乙方生产的货品中，有不符合本协议约定的产品标准和要求以及产品包装要求的货品（以下简称"不合格品"），则乙方保证在3个自然日内，对不合格品进行返工重做并承担返工所需的成本费用。且乙方保证本次所生产全部货品的不合格品率（不合格品率=不合格品/采购数量）在1%以下。',
    payment_ratio_deposit: depositRatio,
    payment_ratio_final: finalRatio,
    payment_account_name: accountName,
    payment_bank_name: bankName,
    payment_bank_account: supplierBankAccount || '',
    payment_bank_branch: bankName,
    payment_clause: `甲方承诺在合同签署后，货物生产前将货物采购订金支付至乙方指定银行账户，采购订金为货物采购总金额的${depositPercent}%；乙方完成全部货物的生产后，甲方对乙方生产货物进行现场验收，并向乙方支付剩余${finalPercent}%的采购尾款，如甲方验收时发现不合格品，则不合格品的尾款待乙方完成返工并交付甲方后，由甲方立即支付给乙方。\n\n乙方指定的收款账户信息如下：\n户名：${accountName || '________'}\n账户号：${supplierBankAccount || '________'}\n开户行：${bankName || '________'}`,
    invoice_clause: '乙方在收到甲方通知乙方开具发票时，乙方须在3个工作日内按本合同中甲方要求的开票信息为甲方开具增值税专用发票，开票信息如下：\n名称：上海掇骁贸易有限公司\n税号：91310109MACHK7GN2R\n开户行：中信银行黄浦支行 8110201012001655475\n联系地址：上海市虹口区同心路723号13幢5321室 13917000290',
    section6_text: '1) 合同签署后甲方须及时向乙方支付采购订金，并按合同约定时间及时向乙方支付采购货物的尾款。\n2) 甲方须在乙方完成货物生产后，及时对货物进行验收。',
    section7_text: '1) 确保货物的规格质量与货物生产前寄给甲方的各批次产品对应的产前样品相符，并符合上述产品规格和尺寸说明的标准及成品要求。\n2) 确保甲方在完成采购订金的支付后，乙方按本合同中约定的时间按时完成货物的生产与包装。\n3) 如乙方未遵守上述约定，则甲方有权利要求乙方退或更换该次采购的部分或全部货品。',
    section8_text: '1) 本合同的有效性、解释、执行及争议解决适用中华人民共和国的法律和法规。\n2) 因履行本合同产生的或与本合同有关的任何争议，应由甲乙双方友好协商解决，协商不成的，任何一方有权将争议提交原告方住所地人民法院解决。',
    section9_text: '1) 本合同未尽事宜，双方可另行订立补充合同。本合同补充合同、附件、附录、合同订单为本合同不可分割的有效组成部分，与本合同具有同等的法律效力。\n2) 本合同一式两份，甲乙双方各执一份，具有同等法律效力。'
  }
}

function buildDefaultProductItems(items = []) {
  const grouped = {}

  items.forEach((item) => {
    const key = item.part_type_id || item.part_name || item.item_id
    if (!grouped[key]) {
      grouped[key] = {
        item_type: 'product',
        row_id: `pi_${key}`,
        part_type_id: item.part_type_id || '',
        part_name: item.part_name || '',
        model: item.part_name || '',
        size: item.part_size || '',
        material: item.part_material || '',
        weight: item.part_weight || '',
        color: item.part_color || '',
        total_qty: 0,
        unit_price: item.unit_price != null ? Number(item.unit_price) : null,
        qty_detail_rows: [],
        source_item_ids: []
      }
    }

    grouped[key].total_qty += Number(item.quantity || 0)
    grouped[key].unit_price = grouped[key].unit_price != null ? grouped[key].unit_price : normalizeNullableNumber(item.unit_price)
    grouped[key].qty_detail_rows.push(`${item.sku_spec || item.sku_id || item.part_name || '规格'}：${Number(item.quantity || 0)}件`)
    if (item.item_id) {
      grouped[key].source_item_ids.push(item.item_id)
    }
  })

  return Object.values(grouped).map((item) => ({
    item_type: item.item_type,
    row_id: item.row_id,
    part_type_id: item.part_type_id,
    part_name: item.part_name,
    model: item.model,
    size: item.size,
    material: item.material,
    weight: item.weight,
    color: item.color,
    total_qty: item.total_qty,
    qty_detail: item.qty_detail_rows.join('\n'),
    unit_price: item.unit_price,
    source_item_ids: item.source_item_ids
  }))
}

function createEmptyDeliveryRow(productItems = []) {
  const qtys = {}
  productItems.filter(isDeliverableProductItem).forEach((item) => {
    qtys[item.row_id] = 0
  })

  return {
    row_id: `dr_${Date.now()}`,
    date: '',
    qtys
  }
}

function normalizeDeliveryRows(deliveryRows = [], productItems = []) {
  const deliverableItems = productItems.filter(isDeliverableProductItem)
  const itemIds = new Set(deliverableItems.map(item => item.row_id))
  const legacyNameToId = {}
  deliverableItems.forEach((item) => {
    legacyNameToId[item.part_name] = item.row_id
    legacyNameToId[item.model] = item.row_id
  })

  const normalized = (deliveryRows || []).map((row, index) => {
    const nextRow = {
      row_id: row.row_id || `dr_${index + 1}`,
      date: row.date || '',
      qtys: {}
    }

    deliverableItems.forEach((item) => {
      nextRow.qtys[item.row_id] = 0
    })

    Object.entries(row.qtys || {}).forEach(([key, value]) => {
      if (itemIds.has(key)) {
        nextRow.qtys[key] = Number(value || 0)
        return
      }

      if (legacyNameToId[key]) {
        nextRow.qtys[legacyNameToId[key]] = Number(value || 0)
      }
    })

    return nextRow
  })

  return normalized.length > 0 ? normalized : [createEmptyDeliveryRow(deliverableItems)]
}

function buildRawMaterialsText(rawMaterials = []) {
  return (rawMaterials || [])
    .map(item => String(item.name || '').trim())
    .filter(Boolean)
    .join('、')
}

function ensureContractDocument(contract = {}, supplier = {}) {
  const buyerInfo = createBuyerInfo(contract.buyer_info || {})
  const productItems = normalizeProductItems(contract.product_items, contract.items || [])
  const rawMaterialsText = String(
    contract.raw_materials
    || buildRawMaterialsText(supplier.raw_materials || [])
    || ''
  ).trim()

  const defaultClauseSections = createClauseSections({
    productDesc: contract.product_desc || inferProductDesc(productItems),
    rawMaterials: rawMaterialsText,
    depositRatio: contract.deposit_ratio != null ? contract.deposit_ratio : 0.3,
    finalRatio: contract.final_ratio != null ? contract.final_ratio : 0.7,
    supplierAccountName: contract.supplier_bank_account_name || contract.payment_account_name || contract.supplier_name || supplier.name || '',
    supplierBankName: contract.supplier_bank_name || supplier.bank_info?.bank_name || '',
    supplierBankAccount: contract.supplier_bank_account || supplier.bank_info?.bank_account || '',
    supplierBankBranch: contract.supplier_bank_name || supplier.bank_info?.bank_name || contract.supplier_bank_branch || supplier.bank_info?.bank_branch || ''
  })
  const incomingClauseSections = contract.clause_sections || {}
  const clauseSections = {
    ...defaultClauseSections,
    ...incomingClauseSections
  }
  clauseSections.payment_account_name = clauseSections.payment_account_name
    || contract.supplier_bank_account_name
    || contract.payment_account_name
    || contract.supplier_name
    || supplier.name
    || ''
  clauseSections.payment_bank_name = clauseSections.payment_bank_name
    || contract.supplier_bank_name
    || supplier.bank_info?.bank_name
    || contract.supplier_bank_branch
    || supplier.bank_info?.bank_branch
    || ''
  clauseSections.payment_bank_branch = clauseSections.payment_bank_branch || clauseSections.payment_bank_name
  clauseSections.payment_bank_account = clauseSections.payment_bank_account
    || contract.supplier_bank_account
    || supplier.bank_info?.bank_account
    || ''
  const existingPaymentClause = String(incomingClauseSections.payment_clause || '')
  const isGeneratedPaymentClause = existingPaymentClause.includes('乙方指定的收款账户信息如下')
  if (!existingPaymentClause || (isGeneratedPaymentClause && !existingPaymentClause.includes(`户名：${clauseSections.payment_account_name}`))) {
    clauseSections.payment_clause = defaultClauseSections.payment_clause
  }

  return {
    buyer_info: buyerInfo,
    product_desc: contract.product_desc || inferProductDesc(productItems),
    raw_materials: rawMaterialsText,
    product_items: productItems,
    delivery_rows: normalizeDeliveryRows(contract.delivery_rows || [], productItems),
    clause_sections: clauseSections,
    appendix_images: normalizeAppendixImages(contract.appendix_images || contract.attachment_images || [])
  }
}

function normalizeProductItems(productItems, items) {
  if (Array.isArray(productItems) && productItems.length > 0) {
    return productItems.map((item, index) => ({
      item_type: item.item_type === 'fee' ? 'fee' : 'product',
      row_id: item.row_id || `pi_${index + 1}`,
      part_type_id: item.part_type_id || '',
      part_name: item.part_name || item.model || '',
      model: item.model || item.part_name || '',
      size: item.size || '',
      material: item.material || '',
      weight: item.weight || '',
      color: item.color || '',
      qty_detail: item.qty_detail || '',
      total_qty: item.item_type === 'fee' ? Number(item.total_qty || 1) : Number(item.total_qty || 0),
      unit_price: normalizeNullableNumber(item.unit_price),
      source_item_ids: Array.isArray(item.source_item_ids) ? item.source_item_ids : []
    }))
  }

  return buildDefaultProductItems(items)
}

function inferProductDesc(productItems = []) {
  const names = productItems
    .filter(isDeliverableProductItem)
    .map(item => String(item.part_name || item.model || '').trim())
    .filter(Boolean)
  return names.length > 0 ? names.join('、') : '配件'
}

function normalizeNullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? null : numberValue
}

function formatPercent(value) {
  return (Number(value || 0) * 100).toFixed(0)
}

function isDeliverableProductItem(item = {}) {
  return item.item_type !== 'fee'
}

function calcDeliveryColTotal(contractDraft = {}, rowId = '') {
  return (contractDraft.delivery_rows || contractDraft.deliveryRows || []).reduce((sum, row) => {
    return sum + Number(row.qtys?.[rowId] || 0)
  }, 0)
}

function validateDeliveryTotals(contractDraft = {}) {
  const productItems = (contractDraft.product_items || contractDraft.productItems || []).filter(isDeliverableProductItem)
  const deliveryRows = contractDraft.delivery_rows || contractDraft.deliveryRows || []
  const errors = []

  productItems.forEach((item) => {
    const expected = Number(item.total_qty || 0)
    const actual = deliveryRows.reduce((sum, row) => sum + Number(row.qtys?.[item.row_id] || 0), 0)
    if (expected !== actual) {
      errors.push(`${item.model || item.part_name || '未命名货物'}：采购数量 ${expected}，交付计划 ${actual}`)
    }
  })

  if (errors.length > 0) {
    const error = new Error(`交付计划数量必须与采购数量一致：${errors.join('；')}`)
    error.code = 400
    error.details = errors
    throw error
  }
}

function normalizeAppendixImages(images = []) {
  return (Array.isArray(images) ? images : [])
    .map((item, index) => ({
      file_id: item.file_id || item.fileId || '',
      url: item.url || item.tempUrl || '',
      name: item.name || `附录图片${index + 1}`,
      note: item.note || ''
    }))
    .filter(item => item.file_id || item.url)
}

module.exports = {
  buildDefaultProductItems,
  buildRawMaterialsText,
  calcDeliveryColTotal,
  createBuyerInfo,
  createClauseSections,
  createEmptyDeliveryRow,
  ensureContractDocument,
  isDeliverableProductItem,
  normalizeAppendixImages,
  normalizeDeliveryRows,
  validateDeliveryTotals
}
