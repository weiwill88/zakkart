/**
 * 种子数据生成脚本
 *
 * 将 admin/src/data/products.js 和 suppliers.js 中的硬编码数据
 * 转换为 NoSQL 文档格式，输出为 JSON Lines 文件供云数据库导入。
 *
 * 用法：node scripts/seed-data.js
 * 输出：scripts/output/ 目录下的 JSON / pretty JSON 文件
 */

const fs = require('fs')
const path = require('path')

// ============================================================
// 1. 供应商原始数据（从 suppliers.js 提取）
// ============================================================
const suppliersRaw = [
  {
    id: 'SUP001', name: '宁波柯诚金属制品有限公司', creditCode: '91330281MA2H86K978',
    legalPerson: '秦雅娟', contact: '秦雅娟', phone: '',
    scope: '负责01/03/04/07/09款铁架生产 + 成品包装',
    partTypes: ['frame', 'packaging'],
    productCodes: ['CWP01', 'CWP03', 'CWP04', 'CWP07', 'CWP09'],
    hasAssembly: true, // 柯诚是组装厂
    status: 'active'
  },
  {
    id: 'SUP002', name: '宁波辰申塑业有限公司', creditCode: '91330281742176128H',
    legalPerson: '沈静波', contact: '沈静波', phone: '',
    scope: '负责塑料配件的生产',
    partTypes: ['plastic'],
    productCodes: ['CWP01', 'CWP02', 'CWP03', 'CWP04', 'CWP05', 'CWP07', 'CWP08', 'CWP09'],
    hasAssembly: false,
    status: 'active'
  },
  {
    id: 'SUP003', name: '绍兴星驰工艺品有限公司', creditCode: '91330604MA7F9CFT87',
    legalPerson: '章燕芳', contact: '章燕芳', phone: '',
    scope: '负责02/05/08款铁架生产 + 成品包装',
    partTypes: ['frame', 'packaging'],
    productCodes: ['CWP02', 'CWP05', 'CWP08'],
    hasAssembly: true, // 星驰是组装厂
    status: 'active'
  },
  {
    id: 'SUP004', name: '曹县鹏泰木制工艺品有限公司', creditCode: '91371721MA7JERRJ4D',
    legalPerson: '孙鹏', contact: '孙鹏', phone: '',
    scope: '负责实木配件的生产',
    partTypes: ['wood'],
    productCodes: ['CWP03', 'CWP07', 'CWP09'],
    hasAssembly: false,
    status: 'active'
  },
  {
    id: 'SUP005', name: '金华市金东区倍思丽日用品厂', creditCode: '92330703MA29PUY70X',
    legalPerson: '刘晓东', contact: '刘晓东', phone: '',
    scope: '负责吸盘的生产',
    partTypes: ['suction'],
    productCodes: ['CWP01', 'CWP02', 'CWP03', 'CWP04', 'CWP05', 'CWP07', 'CWP09'],
    hasAssembly: false,
    status: 'active'
  },
  {
    id: 'SUP006', name: '浦江旺钰宠物用品有限公司', creditCode: '91330782MA2JW23R8R',
    legalPerson: '张小将', contact: '张小将', phone: '',
    scope: '负责垫子的生产',
    partTypes: ['cushion'],
    productCodes: ['CWP01', 'CWP02', 'CWP03', 'CWP04', 'CWP05', 'CWP07', 'CWP08', 'CWP09'],
    hasAssembly: false,
    status: 'active'
  },
  {
    id: 'SUP007', name: '永康市图成工贸有限公司', creditCode: '91330784MA29R3DP1G',
    legalPerson: '金聪', contact: '金聪', phone: '',
    scope: '负责猫抓板的生产和包装',
    partTypes: ['packaging'],
    productCodes: ['CSP001'],
    hasAssembly: false,
    status: 'active'
  },
  {
    id: 'SUP008', name: '乐卡（义乌）工艺品有限公司', creditCode: '91330782343997826F',
    legalPerson: '杨二套', contact: '杨二套', phone: '',
    scope: '负责猫抓板的生产和包装',
    partTypes: ['packaging'],
    productCodes: ['CSP001'],
    hasAssembly: false,
    status: 'active'
  }
]

// 供应商 ID 映射: SUP001 → org_001
const orgIdMap = {}
suppliersRaw.forEach((s, i) => {
  orgIdMap[s.id] = `org_${String(i + 1).padStart(3, '0')}`
})

// 配件类型到供应商的映射
// 根据业务规则：一种配件类型由一家主要供应商生产
const partTypeCategoryMap = {
  cushion: { category: '垫子', supplierId: 'SUP006' },
  frame: { category: '铁架套装', supplierId: 'SUP001' }, // 柯诚为主，星驰为辅
  suction: { category: '吸盘', supplierId: 'SUP005' },
  wood: { category: '实木配件', supplierId: 'SUP004' },
  plastic: { category: '塑料配件', supplierId: 'SUP002' },
  disc: { category: '孔盘配件', supplierId: 'SUP002' }, // 辰申
  packaging: { category: '成品包装', supplierId: 'SUP001' }, // 柯诚为主
  other: { category: '其他配件', supplierId: 'SUP001' },
}

// ============================================================
// 2. 产品原始数据（从 products.js 提取关键结构）
// ============================================================
// 这里不重复贴完整数据，改为直接读取文件并做 eval
// 为避免 ESM import，我们用正则提取

const productsFilePath = path.join(__dirname, '../admin/src/data/products.js')
const productsFileContent = fs.readFileSync(productsFilePath, 'utf8')

// 提取 products 数组（简单替换 export 关键字后 eval）
let productsRaw = []
try {
  const cleanedContent = productsFileContent
    .replace(/export\s+const\s+PART_TYPES\s*=\s*\{[\s\S]*?\}\s*\n/m, '')
    .replace(/export\s+const\s+products\s*=\s*/, 'module.exports = ')
    .replace(/export\s+function\s+getProductStats[\s\S]*$/, '')

  const tmpFile = path.join(__dirname, '_tmp_products.js')
  fs.writeFileSync(tmpFile, cleanedContent)
  productsRaw = require(tmpFile)
  fs.unlinkSync(tmpFile)
} catch (e) {
  console.error('Failed to parse products.js, falling back to manual data extraction')
  console.error(e.message)
  process.exit(1)
}

// ============================================================
// 3. 生成 organizations 集合
// ============================================================
const now = new Date().toISOString()

const organizations = suppliersRaw.map((s, i) => ({
  _id: orgIdMap[s.id],
  name: s.name,
  credit_code: s.creditCode,
  legal_person: s.legalPerson,
  has_assembly: s.hasAssembly,
  cooperation_status: s.status,
  cooperation_note: s.scope,
  bank_info: {
    bank_name: '',
    bank_account: ''
  },
  created_at: now,
  updated_at: now
}))

// ============================================================
// 4. 生成 part_types 集合（从所有产品 BOM 去重）
// ============================================================
const partTypeSet = new Map() // key: "partType|partName" → part_type doc
let ptCounter = 0

// 根据产品编号判断铁架供应商
function getFrameSupplier(productCode) {
  // 02/05/08 款由星驰（SUP003）负责
  if (['CWP02', 'CWP05', 'CWP08'].some(c => productCode.startsWith(c))) {
    return 'SUP003'
  }
  return 'SUP001' // 其余由柯诚负责
}

function getPackagingSupplier(productCode) {
  if (productCode === 'CSP001') {
    return 'SUP007' // 猫抓板包装由图成
  }
  // 包装跟铁架走同一家
  return getFrameSupplier(productCode)
}

productsRaw.forEach(product => {
  product.skus.forEach(sku => {
    ;(sku.bom || []).forEach(bom => {
      const key = `${bom.partType}|${bom.partName}`
      if (!partTypeSet.has(key)) {
        let supplierId
        if (bom.partType === 'frame') {
          supplierId = getFrameSupplier(product.code)
        } else if (bom.partType === 'packaging') {
          supplierId = getPackagingSupplier(product.code)
        } else {
          supplierId = partTypeCategoryMap[bom.partType]?.supplierId || 'SUP001'
        }

        ptCounter++
        const ptId = `pt_${String(ptCounter).padStart(3, '0')}`
        const orgId = orgIdMap[supplierId]
        const supplier = suppliersRaw.find(s => s.id === supplierId)

        partTypeSet.set(key, {
          _id: ptId,
          name: bom.partName,
          category: partTypeCategoryMap[bom.partType]?.category || bom.partType,
          supplier_org_id: orgId,
          supplier_org_name: supplier?.name || '',
          unit: bom.unit || '件',
          unit_price: null,
          price_note: '',
          created_at: now
        })
      }
    })
  })
})

const partTypes = Array.from(partTypeSet.values())

// Build a lookup from "partType|partName" → pt_id
const partTypeLookup = new Map()
partTypeSet.forEach((doc, key) => {
  partTypeLookup.set(key, doc)
})

// ============================================================
// 5. 生成 products 集合
// ============================================================
const products = productsRaw.map((p, i) => {
  const productId = `product_${String(i + 1).padStart(3, '0')}`
  let skuCounter = 0

  const skus = p.skus.map(sku => {
    skuCounter++
    const skuId = `sku_${String(i + 1).padStart(3, '0')}_${String(skuCounter).padStart(2, '0')}`

    const bomItems = (sku.bom || []).map(bom => {
      const key = `${bom.partType}|${bom.partName}`
      const ptDoc = partTypeLookup.get(key)
      return {
        part_type_id: ptDoc?._id || '',
        part_name: bom.partName,
        supplier_org_id: ptDoc?.supplier_org_id || '',
        supplier_name: ptDoc?.supplier_org_name || '',
        quantity: bom.qty || 1,
        variant: bom.variant || ''
      }
    })

    return {
      sku_id: skuId,
      child_asin: sku.childAsin || '',
      spec: sku.spec || '',
      fnsku: '',
      bom_items: bomItems
    }
  })

  // Map type: assembled → assembly (NoSQL convention)
  let type = p.type
  if (type === 'assembled') type = 'assembly'

  return {
    _id: productId,
    code: p.code,
    name_cn: p.name,
    name_en: p.nameEn || '',
    parent_asin: p.parentAsin || '',
    type,
    category: p.category || '',
    alert_days: 15,
    skus,
    created_at: now,
    updated_at: now
  }
})

// ============================================================
// 6. 生成 users 集合（初始管理员）
// ============================================================
const users = [
  {
    _id: 'user_super_admin_001',
    org_id: null,
    org_name: null,
    phone: '17521723946',
    name: '韦东东',
    role: 'super_admin',
    wechat_openid: '',
    last_login_at: null,
    status: 'active',
    permissions: [{ permission_key: '*', granted: true }],
    created_at: now
  },
  {
    _id: 'user_admin_001',
    org_id: null,
    org_name: null,
    phone: '13262515903',
    name: '闵一',
    role: 'admin',
    wechat_openid: '',
    last_login_at: null,
    status: 'active',
    permissions: [
      { permission_key: 'dashboard', granted: true },
      { permission_key: 'product', granted: true },
      { permission_key: 'organization', granted: true },
      { permission_key: 'contract', granted: true }
    ],
    created_at: now
  }
]

// ============================================================
// 7. 输出 JSON 文件
// ============================================================
const outputDir = path.join(__dirname, 'output')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

function writeJsonLines(filename, data) {
  const filePath = path.join(outputDir, filename)
  const content = data.map(item => JSON.stringify(item)).join('\n') + '\n'
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`✓ ${filename}: ${data.length} documents (JSON Lines)`)
}

function writePrettyJson(filename, data) {
  const filePath = path.join(outputDir, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`✓ ${filename}: ${data.length} documents (pretty JSON)`)
}

writeJsonLines('organizations.json', organizations)
writeJsonLines('part_types.json', partTypes)
writeJsonLines('products.json', products)
writeJsonLines('users.json', users)

writePrettyJson('organizations.pretty.json', organizations)
writePrettyJson('part_types.pretty.json', partTypes)
writePrettyJson('products.pretty.json', products)
writePrettyJson('users.pretty.json', users)

// Summary
console.log('\n=== 种子数据生成完成 ===')
console.log(`  organizations: ${organizations.length} 家供应商`)
console.log(`  part_types:    ${partTypes.length} 种配件`)
console.log(`  products:      ${products.length} 个 Listing, ${products.reduce((s, p) => s + p.skus.length, 0)} 个 SKU`)
console.log(`  users:         ${users.length} 个管理员`)
console.log(`\n输出目录: ${outputDir}`)
console.log('\n导入方式：')
console.log('  1. 在微信开发者工具的云开发控制台中，逐个集合手动导入 *.json（JSON Lines）')
console.log('  2. *.pretty.json 仅用于人工查看，不用于云数据库导入')
