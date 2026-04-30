const { getCollection, getDb } = require('../config/database')
const { ensureAdmin } = require('../utils/access')
const {
  buildDefaultProductItems,
  buildRawMaterialsText,
  createBuyerInfo,
  createClauseSections,
  createEmptyDeliveryRow
} = require('../utils/contract-document')

const PRODUCTS_COLLECTION = 'products'
const PART_TYPES_COLLECTION = 'part_types'
const ORGS_COLLECTION = 'organizations'
const CONTRACTS_COLLECTION = 'contracts'

/**
 * order.generate
 *
 * 1. Read product SKUs and their BOMs
 * 2. Multiply BOM quantities by SKU allocations
 * 3. Group by supplier_org_id (from part_types)
 * 4. Create one DRAFT contract per supplier
 */
async function generate({ params, auth }) {
  ensureAdmin(auth)
  const { productId, totalQty, skuAllocations } = params

  if (!productId) {
    const error = new Error('缺少产品 ID')
    error.code = 400
    throw error
  }
  if (!Array.isArray(skuAllocations) || skuAllocations.length === 0) {
    const error = new Error('缺少 SKU 分配信息')
    error.code = 400
    throw error
  }

  // 1. Fetch product
  const productResult = await getCollection(PRODUCTS_COLLECTION).doc(productId).get()
  if (!productResult.data) {
    const error = new Error('产品不存在')
    error.code = 404
    throw error
  }
  const product = productResult.data

  // 2. Collect all part_type_ids from BOMs
  const partTypeIds = new Set()
  const skuMap = {}
  for (const sku of (product.skus || [])) {
    skuMap[sku.sku_id] = sku
    for (const bom of (sku.bom_items || [])) {
      partTypeIds.add(bom.part_type_id)
    }
  }

  // 3. Fetch part_types to get supplier info
  const partTypeMap = {}
  if (partTypeIds.size > 0) {
    const ids = Array.from(partTypeIds)
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const _ = require('../config/database').command
      const result = await getCollection(PART_TYPES_COLLECTION)
        .where({ _id: _.in(chunk) })
        .get()
      for (const pt of result.data) {
        partTypeMap[pt._id] = pt
      }
    }
  }

  // 4. BOM explosion: for each SKU allocation, expand BOM items
  // supplierGroups: { [supplier_org_id]: { orgName, items: [{ sku_id, sku_spec, part_type_id, part_name, quantity, unit_price }] } }
  const supplierGroups = {}

  for (const alloc of skuAllocations) {
    const sku = skuMap[alloc.skuId]
    if (!sku) {
      const error = new Error(`SKU ${alloc.skuId} 不存在于该产品中`)
      error.code = 400
      throw error
    }

    for (const bom of (sku.bom_items || [])) {
      const partType = partTypeMap[bom.part_type_id]
      if (!partType) continue

      const supplierId = partType.supplier_org_id
      if (!supplierId) continue

      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          orgName: partType.supplier_org_name || '',
          items: []
        }
      }

      // Quantity = BOM quantity per unit * SKU allocation qty
      const qty = (bom.quantity || 1) * (alloc.qty || 0)

      // Check if same SKU + part combination already exists (merge)
      const existingItem = supplierGroups[supplierId].items.find(
        item => item.sku_id === sku.sku_id && item.part_type_id === bom.part_type_id
      )

      if (existingItem) {
        existingItem.quantity += qty
      } else {
        supplierGroups[supplierId].items.push({
          sku_id: sku.sku_id,
          sku_spec: sku.spec || '',
          part_type_id: bom.part_type_id,
          part_name: bom.part_name || partType.name || '',
          part_material: partType.material || '',
          part_color: partType.color || '',
          part_weight: partType.weight || '',
          part_size: partType.size || '',
          quantity: qty,
          unit_price: partType.unit_price || null
        })
      }
    }
  }

  // 5. Fetch supplier org info for names
  const supplierIds = Object.keys(supplierGroups)
  const orgMap = {}
  for (const sid of supplierIds) {
    try {
      const orgResult = await getCollection(ORGS_COLLECTION).doc(sid).get()
      if (orgResult.data) {
        orgMap[sid] = orgResult.data
      }
    } catch (e) {
      // skip if org not found
    }
  }

  // 6. Generate contract number
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 7. Create DRAFT contracts
  const now = new Date().toISOString()
  const contracts = []

  for (const supplierId of supplierIds) {
    const group = supplierGroups[supplierId]
    const org = orgMap[supplierId] || {}
    const orgName = org.name || group.orgName || ''

    // Generate abbreviation from org name (first letter of each word/character)
    const abbr = generateAbbreviation(orgName)

    // Count existing contracts today for this supplier to determine sequence
    const contractNoRegExp = getDb().RegExp({
      regexp: `^DX-${abbr}-${dateStr}-`,
      options: ''
    })
    const existingCount = await getCollection(CONTRACTS_COLLECTION)
      .where({
        supplier_org_id: supplierId,
        contract_no: contractNoRegExp
      })
      .count()
      .catch(() => ({ total: 0 }))

    const seq = String((existingCount.total || 0) + 1).padStart(3, '0')
    const contractNo = `DX-${abbr}-${dateStr}-${seq}`

    // Build contract items with item_id
    const items = group.items.map((item, index) => ({
      item_id: `ci_${Date.now()}_${index}`,
      sku_id: item.sku_id,
      sku_spec: item.sku_spec,
      part_type_id: item.part_type_id,
      part_name: item.part_name,
      part_material: item.part_material || '',
      part_color: item.part_color || '',
      part_weight: item.part_weight || '',
      part_size: item.part_size || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.unit_price ? item.quantity * item.unit_price : 0
    }))

    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    const productItems = buildDefaultProductItems(items)
    const rawMaterials = buildRawMaterialsText(org.raw_materials || [])
    const productDesc = productItems.map(item => item.part_name).filter(Boolean).join('、') || product.name_cn || '配件'
    const buyerInfo = createBuyerInfo()
    const clauseSections = createClauseSections({
      productDesc,
      rawMaterials,
      depositRatio: 0.30,
      finalRatio: 0.70,
      supplierAccountName: orgName,
      supplierBankName: org.bank_info?.bank_name || '',
      supplierBankAccount: org.bank_info?.bank_account || '',
      supplierBankBranch: org.bank_info?.bank_name || org.bank_info?.bank_branch || ''
    })
    if (org.contract_template?.quality_clause) {
      clauseSections.quality_clause = org.contract_template.quality_clause
    }
    const deliveryRows = [createEmptyDeliveryRow(productItems)]

    const contractDoc = {
      contract_no: contractNo,
      supplier_org_id: supplierId,
      supplier_name: orgName,
      product_id: productId,
      product_name: product.name_cn || '',
      status: 'DRAFT',
      supplier_confirm_status: 'UNSENT',
      supplier_confirmed_at: '',
      supplier_confirmed_by: '',
      total_amount: totalAmount,
      deposit_ratio: 0.30,
      final_ratio: 0.70,
      word_file_id: '',
      signed_pdf_file_id: '',
      signed_at: null,
      created_by: auth ? auth.userId : '',
      items,
      buyer_info: buyerInfo,
      supplier_legal_person: org.legal_person || '',
      supplier_credit_code: org.credit_code || '',
      supplier_address: org.address || '',
      supplier_phone: org.contact_phone || '',
      supplier_bank_account_name: orgName,
      supplier_bank_name: org.bank_info?.bank_name || '',
      supplier_bank_account: org.bank_info?.bank_account || '',
      supplier_bank_branch: org.bank_info?.bank_branch || '',
      product_desc: productDesc,
      product_items: productItems,
      raw_materials: rawMaterials,
      delivery_rows: deliveryRows,
      clause_sections: clauseSections,
      created_at: now,
      updated_at: now
    }

    const addResult = await getCollection(CONTRACTS_COLLECTION).add({ data: contractDoc })

    contracts.push({
      contractId: addResult._id,
      contractNo: contractNo,
      supplierOrgId: supplierId,
      supplierName: orgName,
      legalPerson: org.legal_person || '',
      creditCode: org.credit_code || '',
      address: org.address || '',
      phone: org.contact_phone || '',
      buyerInfo,
      productDesc,
      productItems,
      rawMaterials,
      clauseSections,
      bankInfo: {
        account_name: orgName,
        bank_name: org.bank_info?.bank_name || '',
        bank_account: org.bank_info?.bank_account || '',
        bank_branch: org.bank_info?.bank_branch || ''
      },
      productId,
      productName: product.name_cn || '',
      status: 'DRAFT',
      supplierConfirmStatus: 'UNSENT',
      totalAmount,
      deliveryRows,
      items
    })
  }

  return { contracts }
}

/**
 * Generate abbreviation from Chinese company name
 * Takes last 2 meaningful characters as abbreviation (pinyin initials)
 * Fallback: first 2 chars
 */
function generateAbbreviation(name) {
  if (!name) return 'XX'

  // Common Chinese company suffixes to strip
  const suffixes = ['有限公司', '公司', '集团', '股份', '贸易', '工厂', '厂']
  let cleaned = name
  for (const suffix of suffixes) {
    cleaned = cleaned.replace(new RegExp(suffix + '$'), '')
  }

  // Common Chinese location prefixes to strip
  const prefixes = ['浦江', '义乌', '宁波', '温州', '杭州', '上海', '广州', '深圳', '东莞', '苏州']
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length) {
      cleaned = cleaned.slice(prefix.length)
      break
    }
  }

  if (!cleaned) cleaned = name.slice(0, 2)

  // Simple pinyin initial mapping for common characters in supplier names
  const pinyinMap = {
    '旺': 'W', '钰': 'Y', '柯': 'K', '诚': 'C', '宠': 'C', '物': 'W',
    '美': 'M', '佳': 'J', '达': 'D', '丰': 'F', '华': 'H', '信': 'X',
    '泰': 'T', '恒': 'H', '盛': 'S', '利': 'L', '福': 'F', '德': 'D',
    '和': 'H', '瑞': 'R', '源': 'Y', '通': 'T', '新': 'X', '兴': 'X',
    '龙': 'L', '鑫': 'X', '金': 'J', '银': 'Y', '海': 'H', '天': 'T',
    '中': 'Z', '国': 'G', '大': 'D', '明': 'M', '永': 'Y', '安': 'A',
    '康': 'K', '建': 'J', '创': 'C', '博': 'B', '科': 'K', '远': 'Y',
    '超': 'C', '良': 'L', '优': 'Y', '正': 'Z', '宝': 'B', '力': 'L',
    '飞': 'F', '发': 'F', '嘉': 'J', '成': 'C', '宏': 'H', '伟': 'W',
    '东': 'D', '南': 'N', '西': 'X', '北': 'B', '方': 'F', '圆': 'Y',
    '家': 'J', '居': 'J', '乐': 'L', '雅': 'Y', '艺': 'Y', '品': 'P',
    '汇': 'H', '聚': 'J', '百': 'B', '千': 'Q', '万': 'W', '亿': 'Y'
  }

  let abbr = ''
  for (let i = 0; i < Math.min(cleaned.length, 4) && abbr.length < 2; i++) {
    const char = cleaned[i]
    if (/[A-Za-z]/.test(char)) {
      abbr += char.toUpperCase()
    } else if (pinyinMap[char]) {
      abbr += pinyinMap[char]
    }
  }

  return abbr || 'XX'
}

module.exports = {
  'order.generate': generate
}
