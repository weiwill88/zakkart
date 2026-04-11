/**
 * Zakkart 供应链管理系统 - Mock 数据
 * 基于需求文档中的猫窗台架案例产品构建
 */

// ============================================
// 供应商数据
// ============================================
const suppliers = [
  {
    id: 'SUP001', name: '鑫达实木配件厂', contact: '张厂长', phone: '138****1234',
    type: '实木配件', address: '浙江省台州市',
    contracts: 3, activeContracts: 1, status: 'active'
  },
  {
    id: 'SUP002', name: '舒雅垫子厂', contact: '李经理', phone: '139****5678',
    type: '垫子/布艺', address: '浙江省义乌市',
    contracts: 5, activeContracts: 2, status: 'active'
  },
  {
    id: 'SUP003', name: '钢锐铁架套装厂', contact: '刘总', phone: '137****9012',
    type: '铁架/五金', address: '广东省佛山市',
    contracts: 4, activeContracts: 1, status: 'active'
  },
  {
    id: 'SUP004', name: '瓦楞纸制品厂', contact: '陈师傅', phone: '136****3456',
    type: '瓦楞纸', address: '浙江省温州市',
    contracts: 1, activeContracts: 0, status: 'active'
  }
]

// ============================================
// 产品数据（基于Cat Window Perch案例）
// ============================================
const products = [
  {
    id: 'PROD001',
    code: 'CWP-03',
    name: '窗台搁板款猫窗台架',
    nameEn: 'Cat Perch for Window Sill',
    asin: 'B0XXXXXX01',
    category: '猫窗台架',
    status: 'active',
    skuCount: 6,
    bomParts: 3,
    image: '',
    skus: [
      { id: 'SKU001', code: '03M-深灰', spec: 'M码-深色铁架-灰色垫子', stock: 320 },
      { id: 'SKU002', code: '03M-浅灰', spec: 'M码-浅色铁架-灰色垫子', stock: 280 },
      { id: 'SKU003', code: '03M-深棕', spec: 'M码-深色铁架-棕色垫子', stock: 150 },
      { id: 'SKU004', code: '03M-浅棕', spec: 'M码-浅色铁架-棕色垫子', stock: 0 },
      { id: 'SKU005', code: '03L-浅灰', spec: 'L码-浅色铁架-灰色垫子', stock: 200 },
      { id: 'SKU006', code: '03L-浅棕', spec: 'L码-浅色铁架-棕色垫子', stock: 85 }
    ],
    bom: [
      { partId: 'PART001', name: '垫子', supplier: '舒雅垫子厂', supplierId: 'SUP002', variants: ['03M-棕', '03M-灰', '03L-棕', '03L-灰'], qty: 1 },
      { partId: 'PART002', name: '铁棒套装', supplier: '钢锐铁架套装厂', supplierId: 'SUP003', variants: ['03M-浅色', '03M-深色', '03L-浅色', '03L-深色'], qty: 1, note: '含内盒/外箱/零件包/说明书' },
      { partId: 'PART003', name: '实木配件', supplier: '鑫达实木配件厂', supplierId: 'SUP001', variants: ['原木色', '胡桃色'], qty: 1 }
    ]
  },
  {
    id: 'PROD002',
    code: 'CWP-01',
    name: '经典款猫窗台架',
    nameEn: 'Cat Window Perch',
    asin: 'B0XXXXXX02',
    category: '猫窗台架',
    status: 'active',
    skuCount: 4,
    bomParts: 3,
    image: '',
    skus: [
      { id: 'SKU007', code: '01M-灰', spec: 'M码-灰色', stock: 500 },
      { id: 'SKU008', code: '01M-棕', spec: 'M码-棕色', stock: 420 },
      { id: 'SKU009', code: '01L-灰', spec: 'L码-灰色', stock: 310 },
      { id: 'SKU010', code: '01L-棕', spec: 'L码-棕色', stock: 180 }
    ],
    bom: [
      { partId: 'PART004', name: '垫子', supplier: '舒雅垫子厂', supplierId: 'SUP002', variants: ['01M-棕', '01M-灰', '01L-棕', '01L-灰'], qty: 1 },
      { partId: 'PART005', name: '铁架+吸盘套装', supplier: '钢锐铁架套装厂', supplierId: 'SUP003', variants: ['01M', '01L'], qty: 1 },
      { partId: 'PART006', name: '外箱', supplier: '钢锐铁架套装厂', supplierId: 'SUP003', variants: ['01M', '01L'], qty: 1 }
    ]
  },
  {
    id: 'PROD003',
    code: 'CSB-01',
    name: 'L型猫抓板（2件装）',
    nameEn: 'L-Shaped Cat Scratcher 2-Pack',
    asin: 'B0XXXXXX03',
    category: '猫抓板',
    status: 'active',
    skuCount: 1,
    bomParts: 1,
    image: '',
    isSimple: true,
    skus: [
      { id: 'SKU011', code: 'CSB-01-2PK', spec: '2件装', stock: 800 }
    ],
    bom: [
      { partId: 'PART007', name: 'L型猫抓板2件装成品', supplier: '瓦楞纸制品厂', supplierId: 'SUP004', variants: ['标准'], qty: 1 }
    ]
  }
]

// ============================================
// 仓库数据
// ============================================
const warehouses = [
  { id: 'WH001', name: '华兴组装厂（仓库1）', address: '浙江省义乌市XX路XX号', contact: '赵库管', phone: '135****7890' },
  { id: 'WH002', name: '永达包装厂（仓库2）', address: '浙江省义乌市YY路YY号', contact: '钱库管', phone: '134****6789' }
]

// ============================================
// 合同数据
// ============================================
const contracts = [
  {
    id: 'CON001',
    contractNo: 'DX-PT-CGHT-20260222-002',
    productId: 'PROD001',
    productName: '窗台搁板款猫窗台架',
    supplierId: 'SUP001',
    supplierName: '鑫达实木配件厂',
    partName: '实木配件',
    totalQty: 16000,
    deliveredQty: 7000,
    totalAmount: 320000,
    status: 'in_progress', // draft | in_progress | completed | terminated
    signDate: '2026-02-22',
    batches: [
      { id: 'B001', batchNo: '第1批', planDate: '2026/3/14', planQty: 3000, actualQty: 3000, status: 'completed',
        variants: [{ name: '原木色', planQty: 3000, actualQty: 3000 }] },
      { id: 'B002', batchNo: '第2批', planDate: '2026/3/26', planQty: 4000, actualQty: 4000, status: 'completed',
        variants: [{ name: '原木色', planQty: 4000, actualQty: 4000 }] },
      { id: 'B003', batchNo: '第3批', planDate: '2026/4/8', planQty: 9000, actualQty: 0, status: 'pending_production',
        variants: [{ name: '原木色', planQty: 7200, actualQty: 0 }, { name: '胡桃色', planQty: 1800, actualQty: 0 }] }
    ]
  },
  {
    id: 'CON002',
    contractNo: 'SY-PT-DZ-20260220-001',
    productId: 'PROD001',
    productName: '窗台搁板款猫窗台架',
    supplierId: 'SUP002',
    supplierName: '舒雅垫子厂',
    partName: '垫子',
    totalQty: 16000,
    deliveredQty: 10000,
    totalAmount: 240000,
    status: 'in_progress',
    signDate: '2026-02-20',
    batches: [
      { id: 'B004', batchNo: '第1批', planDate: '2026/3/10', planQty: 4000, actualQty: 4000, status: 'completed',
        variants: [{ name: '03M-棕', planQty: 1000, actualQty: 1000 }, { name: '03M-灰', planQty: 1500, actualQty: 1500 }, { name: '03L-棕', planQty: 500, actualQty: 500 }, { name: '03L-灰', planQty: 1000, actualQty: 1000 }] },
      { id: 'B005', batchNo: '第2批', planDate: '2026/3/20', planQty: 6000, actualQty: 6000, status: 'inspected',
        variants: [{ name: '03M-棕', planQty: 1500, actualQty: 1500 }, { name: '03M-灰', planQty: 2000, actualQty: 2000 }, { name: '03L-棕', planQty: 1000, actualQty: 998 }, { name: '03L-灰', planQty: 1500, actualQty: 1502 }] },
      { id: 'B006', batchNo: '第3批', planDate: '2026/4/5', planQty: 6000, actualQty: 0, status: 'pending_production',
        variants: [{ name: '03M-棕', planQty: 1500, actualQty: 0 }, { name: '03M-灰', planQty: 2000, actualQty: 0 }, { name: '03L-棕', planQty: 1000, actualQty: 0 }, { name: '03L-灰', planQty: 1500, actualQty: 0 }] }
    ]
  },
  {
    id: 'CON003',
    contractNo: 'GR-PT-TJ-20260225-001',
    productId: 'PROD001',
    productName: '窗台搁板款猫窗台架',
    supplierId: 'SUP003',
    supplierName: '钢锐铁架套装厂',
    partName: '铁棒套装',
    totalQty: 16000,
    deliveredQty: 5000,
    totalAmount: 480000,
    status: 'in_progress',
    signDate: '2026-02-25',
    batches: [
      { id: 'B007', batchNo: '第1批', planDate: '2026/3/18', planQty: 5000, actualQty: 5000, status: 'arrived',
        variants: [{ name: '03M-浅色', planQty: 1500, actualQty: 1500 }, { name: '03M-深色', planQty: 1500, actualQty: 1500 }, { name: '03L-浅色', planQty: 1000, actualQty: 1000 }, { name: '03L-深色', planQty: 1000, actualQty: 1000 }] },
      { id: 'B008', batchNo: '第2批', planDate: '2026/3/30', planQty: 5500, actualQty: 0, status: 'produced',
        variants: [{ name: '03M-浅色', planQty: 1500, actualQty: 0 }, { name: '03M-深色', planQty: 1500, actualQty: 0 }, { name: '03L-浅色', planQty: 1250, actualQty: 0 }, { name: '03L-深色', planQty: 1250, actualQty: 0 }] },
      { id: 'B009', batchNo: '第3批', planDate: '2026/4/12', planQty: 5500, actualQty: 0, status: 'pending_production',
        variants: [{ name: '03M-浅色', planQty: 1500, actualQty: 0 }, { name: '03M-深色', planQty: 1500, actualQty: 0 }, { name: '03L-浅色', planQty: 1250, actualQty: 0 }, { name: '03L-深色', planQty: 1250, actualQty: 0 }] }
    ]
  }
]

// ============================================
// 运单/发货数据
// ============================================
const shipments = [
  {
    id: 'SHP001',
    contractId: 'CON003',
    contractNo: 'GR-PT-TJ-20260225-001',
    batchNo: '第2批',
    supplierId: 'SUP003',
    supplierName: '钢锐铁架套装厂',
    partName: '铁棒套装',
    fromAddress: '广东省佛山市XX路',
    toWarehouse: '华兴组装厂（仓库1）',
    toWarehouseId: 'WH001',
    shipDate: '2026/3/28',
    totalQty: 5500,
    items: [
      { variant: '03M-浅色', qty: 1500 },
      { variant: '03M-深色', qty: 1500 },
      { variant: '03L-浅色', qty: 1250 },
      { variant: '03L-深色', qty: 1250 }
    ],
    status: 'pending_logistics', // pending_logistics | pending_receiver | disputed | confirmed
    supplierConfirmed: true,
    logisticsConfirmed: false,
    receiverConfirmed: false,
    hasDispute: false,
    photos: ['photo1.jpg', 'photo2.jpg']
  },
  {
    id: 'SHP002',
    contractId: 'CON002',
    contractNo: 'SY-PT-DZ-20260220-001',
    batchNo: '第2批',
    supplierId: 'SUP002',
    supplierName: '舒雅垫子厂',
    partName: '垫子',
    fromAddress: '浙江省义乌市XX路',
    toWarehouse: '华兴组装厂（仓库1）',
    toWarehouseId: 'WH001',
    shipDate: '2026/3/19',
    totalQty: 6000,
    items: [
      { variant: '03M-棕', qty: 1500 },
      { variant: '03M-灰', qty: 2000 },
      { variant: '03L-棕', qty: 998 },
      { variant: '03L-灰', qty: 1502 }
    ],
    status: 'disputed',
    supplierConfirmed: true,
    logisticsConfirmed: true,
    receiverConfirmed: false,
    hasDispute: true,
    disputeNote: '03L-棕 收到998件，少2件；03L-灰 收到1502件，多2件',
    photos: ['photo3.jpg']
  },
  {
    id: 'SHP003',
    contractId: 'CON001',
    contractNo: 'DX-PT-CGHT-20260222-002',
    batchNo: '第2批',
    supplierId: 'SUP001',
    supplierName: '鑫达实木配件厂',
    partName: '实木配件',
    fromAddress: '浙江省台州市XX路',
    toWarehouse: '华兴组装厂（仓库1）',
    toWarehouseId: 'WH001',
    shipDate: '2026/3/25',
    totalQty: 4000,
    items: [
      { variant: '原木色', qty: 4000 }
    ],
    status: 'confirmed',
    supplierConfirmed: true,
    logisticsConfirmed: true,
    receiverConfirmed: true,
    hasDispute: false,
    photos: ['photo4.jpg', 'photo5.jpg']
  }
]

// ============================================
// 质检数据
// ============================================
const qualityInspections = [
  {
    id: 'QC001',
    contractId: 'CON003',
    contractNo: 'GR-PT-TJ-20260225-001',
    batchNo: '第2批',
    supplierId: 'SUP003',
    supplierName: '钢锐铁架套装厂',
    partName: '铁棒套装',
    totalQty: 5500,
    passedQty: 5480,
    defectQty: 20,
    status: 'pending_confirm', // pending_arrange | pending_inspect | pending_confirm | passed | partial_pass
    inspectDate: '2026/3/27',
    report: '整体质量良好，发现20件表面有轻微划痕，不影响使用但影响外观。建议合格品先行发货。',
    defectDetails: '20件铁架表面轻微划痕（占比0.36%）',
    photos: ['qc1.jpg', 'qc2.jpg', 'qc3.jpg']
  },
  {
    id: 'QC002',
    contractId: 'CON002',
    contractNo: 'SY-PT-DZ-20260220-001',
    batchNo: '第3批',
    supplierId: 'SUP002',
    supplierName: '舒雅垫子厂',
    partName: '垫子',
    totalQty: 6000,
    passedQty: 0,
    defectQty: 0,
    status: 'pending_arrange',
    inspectDate: '',
    report: '',
    photos: []
  }
]

// ============================================
// 库存数据
// ============================================
const inventory = {
  parts: [
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '垫子-03M-棕', productCode: 'CWP-03', qty: 850, unit: '件' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '垫子-03M-灰', productCode: 'CWP-03', qty: 1200, unit: '件' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '垫子-03L-棕', productCode: 'CWP-03', qty: 320, unit: '件' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '垫子-03L-灰', productCode: 'CWP-03', qty: 680, unit: '件' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '铁棒套装-03M-浅色', productCode: 'CWP-03', qty: 500, unit: '套' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '铁棒套装-03M-深色', productCode: 'CWP-03', qty: 480, unit: '套' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '铁棒套装-03L-浅色', productCode: 'CWP-03', qty: 350, unit: '套' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '铁棒套装-03L-深色', productCode: 'CWP-03', qty: 200, unit: '套' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '实木-原木色', productCode: 'CWP-03', qty: 2800, unit: '件' },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', partName: '实木-胡桃色', productCode: 'CWP-03', qty: 0, unit: '件' },
    { warehouseId: 'WH002', warehouseName: '永达包装厂', partName: '垫子-01M-灰', productCode: 'CWP-01', qty: 600, unit: '件' },
    { warehouseId: 'WH002', warehouseName: '永达包装厂', partName: '垫子-01M-棕', productCode: 'CWP-01', qty: 450, unit: '件' }
  ],
  finished: [
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03M-深灰', productName: '窗台搁板款猫窗台架', qty: 320, alertThreshold: 200, isLow: false },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03M-浅灰', productName: '窗台搁板款猫窗台架', qty: 280, alertThreshold: 200, isLow: false },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03M-深棕', productName: '窗台搁板款猫窗台架', qty: 150, alertThreshold: 200, isLow: true },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03M-浅棕', productName: '窗台搁板款猫窗台架', qty: 0, alertThreshold: 200, isLow: true },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03L-浅灰', productName: '窗台搁板款猫窗台架', qty: 200, alertThreshold: 150, isLow: false },
    { warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03L-浅棕', productName: '窗台搁板款猫窗台架', qty: 85, alertThreshold: 150, isLow: true },
    { warehouseId: 'WH002', warehouseName: '永达包装厂', skuCode: '01M-灰', productName: '经典款猫窗台架', qty: 500, alertThreshold: 300, isLow: false },
    { warehouseId: 'WH002', warehouseName: '永达包装厂', skuCode: '01M-棕', productName: '经典款猫窗台架', qty: 420, alertThreshold: 300, isLow: false }
  ]
}

// ============================================
// 通知数据
// ============================================
const notifications = [
  { id: 'N001', type: 'delivery_remind', title: '交付提醒', content: '实木配件（合同 DX-PT-CGHT-20260222-002）第3批计划交付日 4/8，距今还有22天', time: '2026/3/17 09:00', read: false, role: 'admin' },
  { id: 'N002', type: 'quality_arrange', title: '待安排质检', content: '铁棒套装（钢锐铁架套装厂）第2批已标记"已生产待验货"，请安排质检', time: '2026/3/16 14:30', read: false, role: 'admin' },
  { id: 'N003', type: 'shipment_dispute', title: '运单差异', content: '垫子（舒雅垫子厂）第2批运单存在差异，收货方标注数量不一致', time: '2026/3/15 16:20', read: true, role: 'admin' },
  { id: 'N004', type: 'inventory_alert', title: '库存预警', content: '成品 03M-浅棕 库存为0，低于预警阈值200', time: '2026/3/17 08:00', read: false, role: 'admin' },
  { id: 'N005', type: 'delivery_remind', title: '交付提醒', content: '您的合同 DX-PT-CGHT-20260222-002 第3批需在 4/8 前交付，请确认生产进度', time: '2026/3/17 09:00', read: false, role: 'supplier' },
  { id: 'N006', type: 'quality_result', title: '质检结果', content: '您的铁棒套装第2批质检完成，请查看结果', time: '2026/3/16 18:00', read: false, role: 'supplier' },
  { id: 'N007', type: 'shipment_confirm', title: '待确认运单', content: '铁棒套装 5500件 从佛山发往华兴组装厂，请确认装货数量', time: '2026/3/17 10:00', read: false, role: 'logistics' },
  { id: 'N008', type: 'shipment_confirm', title: '待收货确认', content: '铁棒套装 5500件 已发往您的仓库，请准备收货并确认', time: '2026/3/17 10:00', read: false, role: 'warehouse' }
]

// ============================================
// 包装记录
// ============================================
const packingRecords = [
  { id: 'PK001', warehouseId: 'WH001', skuCode: '03M-深灰', productName: '窗台搁板款猫窗台架', qty: 100, date: '2026/3/16', operator: '赵库管' },
  { id: 'PK002', warehouseId: 'WH001', skuCode: '03M-浅灰', productName: '窗台搁板款猫窗台架', qty: 80, date: '2026/3/16', operator: '赵库管' },
  { id: 'PK003', warehouseId: 'WH001', skuCode: '03L-浅灰', productName: '窗台搁板款猫窗台架', qty: 50, date: '2026/3/15', operator: '赵库管', loss: 2, lossNote: '2件实木配件有裂纹' }
]

// ============================================
// 出库记录
// ============================================
const outboundRecords = [
  { id: 'OUT001', warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03M-深灰', productName: '窗台搁板款猫窗台架', qty: 200, date: '2026/3/14', destination: '货代仓（发往FBA）', status: 'confirmed', confirmedBy: '董总', confirmedAt: '2026/3/14 18:00' },
  { id: 'OUT002', warehouseId: 'WH001', warehouseName: '华兴组装厂', skuCode: '03M-浅灰', productName: '窗台搁板款猫窗台架', qty: 150, date: '2026/3/16', destination: '货代仓（发往FBA）', status: 'pending_confirm', confirmedBy: '', confirmedAt: '' }
]

// ============================================
// 状态映射
// ============================================
const statusMap = {
  // 合同状态
  draft: { label: '草稿', type: 'pending' },
  in_progress: { label: '执行中', type: 'in-progress' },
  completed: { label: '已完成', type: 'completed' },
  terminated: { label: '已终止', type: 'abnormal' },
  
  // 批次状态
  pending_production: { label: '待生产', type: 'pending' },
  produced: { label: '已生产待验货', type: 'in-progress' },
  inspected: { label: '已验货待发货', type: 'in-progress' },
  in_transit: { label: '在途运输', type: 'in-progress' },
  arrived: { label: '已到达组装仓', type: 'completed' },
  completed: { label: '已完成', type: 'completed' },

  // 运单状态
  pending_logistics: { label: '待物流确认', type: 'pending' },
  pending_receiver: { label: '待收货确认', type: 'pending' },
  disputed: { label: '有差异待裁定', type: 'abnormal' },
  confirmed: { label: '已确认', type: 'completed' },
  frozen: { label: '冻结处理中', type: 'frozen' },

  // 质检状态
  pending_arrange: { label: '待安排质检', type: 'pending' },
  pending_inspect: { label: '质检中', type: 'in-progress' },
  pending_confirm: { label: '待确认结果', type: 'pending' },
  passed: { label: '质检通过', type: 'completed' },
  partial_pass: { label: '部分通过', type: 'warning' },
  failed: { label: '质检不通过', type: 'abnormal' },

  // 出库状态
  pending_confirm: { label: '待管理员确认', type: 'pending' },
  confirmed: { label: '已确认', type: 'completed' }
}

function getStatusInfo(statusKey) {
  return statusMap[statusKey] || { label: statusKey, type: 'pending' }
}

function getStatusBadgeClass(statusKey) {
  const info = getStatusInfo(statusKey)
  const typeClassMap = {
    'pending': 'badge-pending',
    'in-progress': 'badge-in-progress',
    'completed': 'badge-completed',
    'abnormal': 'badge-abnormal',
    'frozen': 'badge-frozen',
    'warning': 'badge-pending'
  }
  return typeClassMap[info.type] || 'badge-pending'
}

module.exports = {
  suppliers,
  products,
  warehouses,
  contracts,
  shipments,
  qualityInspections,
  inventory,
  notifications,
  packingRecords,
  outboundRecords,
  statusMap,
  getStatusInfo,
  getStatusBadgeClass
}
