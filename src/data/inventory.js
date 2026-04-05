/**
 * 库存模拟数据
 * 
 * 数据来源说明：
 * - FBA 库存：模拟数据，正式版将通过 Amazon SP-API 自动拉取
 * - 供应商库存：模拟数据，正式版由供应商通过小程序端上报
 * - 仓库库存：模拟数据，正式版由仓库操作员通过小程序端上报
 */

// 亚马逊 FBA 库存
export const fbaInventory = [
  { asin: 'B0CB1XSBFW', sku: 'CWP03-深灰M', productCode: 'CWP03', productName: '窗台搁板款猫窗台架', stock: 320, dailySales: 12, daysOfSupply: 26, status: 'normal' },
  { asin: 'B0CB1YDRF3', sku: 'CWP03-淡灰M', productCode: 'CWP03', productName: '窗台搁板款猫窗台架', stock: 280, dailySales: 15, daysOfSupply: 18, status: 'warning' },
  { asin: 'B0CB7ZCSWK', sku: 'CWP03-浅棕M', productCode: 'CWP03', productName: '窗台搁板款猫窗台架', stock: 150, dailySales: 10, daysOfSupply: 15, status: 'warning' },
  { asin: 'B0CSVD1M45', sku: 'CWP03-深棕M', productCode: 'CWP03', productName: '窗台搁板款猫窗台架', stock: 45, dailySales: 8, daysOfSupply: 5, status: 'critical' },
  { asin: 'B0FS781QXR', sku: 'CWP03-灰色L', productCode: 'CWP03', productName: '窗台搁板款猫窗台架', stock: 200, dailySales: 6, daysOfSupply: 33, status: 'normal' },
  { asin: 'B0FS771C22', sku: 'CWP03-浅棕L', productCode: 'CWP03', productName: '窗台搁板款猫窗台架', stock: 85, dailySales: 5, daysOfSupply: 17, status: 'warning' },
  { asin: 'B08SQ465CN', sku: 'CWP01-白色', productCode: 'CWP01', productName: '经典款猫窗台架', stock: 500, dailySales: 20, daysOfSupply: 25, status: 'normal' },
  { asin: 'B09B1Z0F4M', sku: 'CWP01-灰色', productCode: 'CWP01', productName: '经典款猫窗台架', stock: 420, dailySales: 18, daysOfSupply: 23, status: 'normal' },
  { asin: 'B0DDPX95ZJ', sku: 'CWP07-灰色M', productCode: 'CWP07', productName: '猫窗台架（升级款）', stock: 180, dailySales: 14, daysOfSupply: 12, status: 'warning' },
  { asin: 'B0DDPWNDF01', sku: 'CWP07-浅棕M', productCode: 'CWP07', productName: '猫窗台架（升级款）', stock: 60, dailySales: 11, daysOfSupply: 5, status: 'critical' },
  { asin: 'B0DDPWW5Q6', sku: 'CWP07-淡灰M', productCode: 'CWP07', productName: '猫窗台架（升级款）', stock: 350, dailySales: 9, daysOfSupply: 38, status: 'normal' },
  { asin: 'B0F9FD3115', sku: 'CWP08-N-白色', productCode: 'CWP08', productName: '孔盘款猫窗台架', stock: 220, dailySales: 7, daysOfSupply: 31, status: 'normal' },
  { asin: 'B0F9FMKC7M5', sku: 'CWP09-浅白M', productCode: 'CWP09', productName: '最新款猫窗台架', stock: 130, dailySales: 16, daysOfSupply: 8, status: 'critical' },
  { asin: 'B0F9FNHCLQ', sku: 'CWP09-浅白L', productCode: 'CWP09', productName: '最新款猫窗台架', stock: 95, dailySales: 10, daysOfSupply: 9, status: 'critical' },
  { asin: 'B0DPM6D3TRB', sku: 'CSP001-猫抓板大号', productCode: 'CSP001', productName: '猫抓板系列', stock: 800, dailySales: 30, daysOfSupply: 26, status: 'normal' },
]

// 供应商端库存（在制品 + 成品）
export const supplierInventory = [
  { supplierId: 'SUP006', supplierName: '浦江旺钰', partType: 'cushion', partName: '垫子（各规格合计）', wip: 2000, semiFinished: 800, finished: 1200, contractBatch: 'CON-CWP03-B3', note: '第3批在制中' },
  { supplierId: 'SUP001', supplierName: '宁波柯诚', partType: 'frame', partName: '铁架套装（CWP03相关）', wip: 3000, semiFinished: 0, finished: 1500, contractBatch: 'CON-CWP03-B3', note: '成品待发' },
  { supplierId: 'SUP001', supplierName: '宁波柯诚', partType: 'frame', partName: '铁架套装（CWP07相关）', wip: 1000, semiFinished: 500, finished: 800, contractBatch: 'CON-CWP07-B2', note: '部分完工' },
  { supplierId: 'SUP004', supplierName: '曹县鹏泰', partType: 'wood', partName: '橡胶木实木配件', wip: 1500, semiFinished: 500, finished: 800, contractBatch: 'CON-CWP03-B3', note: '' },
  { supplierId: 'SUP004', supplierName: '曹县鹏泰', partType: 'wood', partName: '松木实木配件（CWP07）', wip: 800, semiFinished: 200, finished: 600, contractBatch: 'CON-CWP07-B2', note: '' },
  { supplierId: 'SUP005', supplierName: '金华倍思丽', partType: 'suction', partName: '吸盘（各规格合计）', wip: 0, semiFinished: 0, finished: 5000, contractBatch: '-', note: '充足库存' },
  { supplierId: 'SUP002', supplierName: '宁波辰申', partType: 'plastic', partName: '塑料配件', wip: 500, semiFinished: 0, finished: 3000, contractBatch: '-', note: '' },
  { supplierId: 'SUP003', supplierName: '绍兴星驰', partType: 'frame', partName: '铁架套装（CWP08相关）', wip: 2000, semiFinished: 300, finished: 400, contractBatch: 'CON-CWP08-B1', note: '新品首批' },
  { supplierId: 'SUP007', supplierName: '永康图成', partType: 'packaging', partName: '猫抓板成品', wip: 500, semiFinished: 0, finished: 2000, contractBatch: 'CON-CSP-B2', note: '' },
]

// 组装仓库存（配件 + 成品）
export const warehouseInventory = {
  parts: [
    { warehouse: '华兴组装厂', partType: 'cushion', partName: '垫子-03M-灰色', qty: 1200, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'cushion', partName: '垫子-03M-棕色', qty: 850, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'cushion', partName: '垫子-03L-灰色', qty: 680, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'cushion', partName: '垫子-03L-棕色', qty: 320, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'frame', partName: '铁棒-03M-白色', qty: 500, unit: '套' },
    { warehouse: '华兴组装厂', partType: 'frame', partName: '铁棒-03M-阳光黑', qty: 480, unit: '套' },
    { warehouse: '华兴组装厂', partType: 'frame', partName: '铁棒-03L-白色', qty: 350, unit: '套' },
    { warehouse: '华兴组装厂', partType: 'wood', partName: '橡胶木-M', qty: 900, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'wood', partName: '橡胶木-L', qty: 400, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'wood', partName: '橡胶木-原木色', qty: 2800, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'wood', partName: '橡胶木-胡桃色', qty: 0, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'frame', partName: '铁棒-07M-白色', qty: 300, unit: '套' },
    { warehouse: '华兴组装厂', partType: 'wood', partName: '松木实木配件', qty: 600, unit: '件' },
    { warehouse: '华兴组装厂', partType: 'wood', partName: '松木刚棚实木', qty: 550, unit: '件' },
  ],
  finished: [
    { warehouse: '华兴组装厂', sku: '03M-深灰', productName: '窗台搁板款猫窗台架', qty: 320, alertThreshold: 200 },
    { warehouse: '华兴组装厂', sku: '03M-浅灰', productName: '窗台搁板款猫窗台架', qty: 280, alertThreshold: 200 },
    { warehouse: '华兴组装厂', sku: '03M-深棕', productName: '窗台搁板款猫窗台架', qty: 150, alertThreshold: 200 },
    { warehouse: '华兴组装厂', sku: '03M-浅棕', productName: '窗台搁板款猫窗台架', qty: 0, alertThreshold: 200 },
    { warehouse: '华兴组装厂', sku: '03L-灰色', productName: '窗台搁板款猫窗台架', qty: 200, alertThreshold: 150 },
    { warehouse: '华兴组装厂', sku: '03L-棕色', productName: '窗台搁板款猫窗台架', qty: 85, alertThreshold: 150 },
    { warehouse: '华兴组装厂', sku: '07M-灰色', productName: '猫窗台架（升级款）', qty: 100, alertThreshold: 100 },
    { warehouse: '华兴组装厂', sku: '07M-浅棕', productName: '猫窗台架（升级款）', qty: 60, alertThreshold: 100 },
  ]
}

// 可组装量计算（基于BOM的木桶效应）
export const assemblyForecast = [
  { sku: 'CWP03-深灰M(03M-灰+白铁+橡胶木M+原木色)', bottleneck: '铁棒-03M-白色', bottleneckQty: 500, maxAssembly: 500, limitedBy: '铁架套装' },
  { sku: 'CWP03-深棕M(03M-棕+黑铁+橡胶木M+原木色)', bottleneck: '铁棒-03M-阳光黑', bottleneckQty: 480, maxAssembly: 480, limitedBy: '铁架套装' },
  { sku: 'CWP03-灰色L(03L-灰+L白铁+橡胶木L+原木色)', bottleneck: '铁棒-03L-白色', bottleneckQty: 350, maxAssembly: 350, limitedBy: '铁架套装' },
  { sku: 'CWP03-浅棕L(03L-棕+L白铁+橡胶木L+原木色)', bottleneck: '橡胶木-L', bottleneckQty: 400, maxAssembly: 320, limitedBy: '垫子(03L-棕色仅320件)' },
  { sku: 'CWP07-灰色M(07M-灰+07白铁+松木+松木刚棚)', bottleneck: '铁棒-07M-白色', bottleneckQty: 300, maxAssembly: 300, limitedBy: '铁架套装' },
]
