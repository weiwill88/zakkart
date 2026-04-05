/**
 * Zakkart 完整产品数据
 * 数据来源：客户提供的产品 BOM 映射表（2026-03-21）
 * 
 * 层级结构：Listing（父ASIN）→ SKU（子ASIN）→ BOM（配件清单）
 */

// 配件类型枚举
export const PART_TYPES = {
  CUSHION: { key: 'cushion', label: '垫子', tagClass: 'tag-cushion', icon: '🛋️' },
  FRAME: { key: 'frame', label: '铁架套装', tagClass: 'tag-frame', icon: '🔧' },
  SUCTION: { key: 'suction', label: '吸盘', tagClass: 'tag-suction', icon: '⭕' },
  WOOD: { key: 'wood', label: '实木配件', tagClass: 'tag-wood', icon: '🪵' },
  PLASTIC: { key: 'plastic', label: '塑料配件', tagClass: 'tag-plastic', icon: '🔩' },
  DISC: { key: 'disc', label: '孔盘配件', tagClass: 'tag-disc', icon: '💿' },
  PACKAGING: { key: 'packaging', label: '成品包装', tagClass: 'tag-packaging', icon: '📦' },
}

// ============================================
// 完整产品 Listing 数据
// ============================================
export const products = [
  // ---- CWP01 经典款猫窗台架 ----
  {
    id: 'PROD_CWP01',
    parentAsin: 'B099MMYBQQ',
    code: 'CWP01',
    name: '经典款猫窗台架',
    nameEn: 'Cat Window Perch - Classic',
    category: '猫窗台架',
    type: 'assembled', // assembled | simple | accessory
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP01_01',
        childAsin: 'B08SQ465CN',
        code: 'CWP01-白色',
        spec: '01-白色',
        bom: [
          { partType: 'cushion', partName: '01-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '01铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '01吸盘', qty: 1, unit: '套', variant: '标准' },
          { partType: 'packaging', partName: '01成品包装', qty: 1, unit: '套(每袋4个吸盘)', variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP01_02',
        childAsin: 'B09B1Z0F4M',
        code: 'CWP01-灰色',
        spec: '01-灰色',
        bom: [
          { partType: 'cushion', partName: '01-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '01铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '01吸盘', qty: 1, unit: '套', variant: '标准' },
          { partType: 'packaging', partName: '01成品包装', qty: 1, unit: '套(每袋4个吸盘)', variant: '标准' },
        ]
      }
    ]
  },

  // ---- CWP02 多款式猫窗台架 ----
  {
    id: 'PROD_CWP02',
    parentAsin: 'B0DNI3CL8',
    code: 'CWP02',
    name: '多款式猫窗台架',
    nameEn: 'Cat Window Perch - Multi Style',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP02_01', childAsin: 'B0CS5GMQSZ', code: 'CWP02-白色', spec: '02-白色',
        bom: [
          { partType: 'cushion', partName: '02-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '02铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '02螺杆吸盘', qty: 1, unit: '套(每盒4个吸盘)', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP02_02', childAsin: 'B0CJ91Y3FL', code: 'CWP05-白色', spec: '05-白色',
        bom: [
          { partType: 'cushion', partName: '05-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '05铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '05吸盘', qty: 1, unit: '套', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP02_03', childAsin: 'B0CS6F5X5RG', code: 'CWP02-灰色', spec: '02-灰色·2件',
        bom: [
          { partType: 'cushion', partName: '02-灰色', qty: 2, variant: '灰色' },
          { partType: 'frame', partName: '02铁架', qty: 2, variant: '标准' },
          { partType: 'suction', partName: '02吸盘', qty: 2, unit: '套', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 2, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP02_04', childAsin: 'B0CJ9Z259N', code: 'CWP05-灰色', spec: '05-灰色',
        bom: [
          { partType: 'cushion', partName: '05-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '05铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '05吸盘', qty: 1, unit: '套', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP02_05', childAsin: 'B0CS5G0Q3P', code: 'CWP02-杂色', spec: '02-杂色',
        bom: [
          { partType: 'cushion', partName: '02-杂色', qty: 1, variant: '杂色' },
          { partType: 'frame', partName: '02铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '02吸盘', qty: 1, unit: '套', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP02_06', childAsin: 'B0CJ0ZM66D', code: 'CWP05-杂色', spec: '05-杂色',
        bom: [
          { partType: 'cushion', partName: '05-杂色', qty: 1, variant: '杂色' },
          { partType: 'frame', partName: '05铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '05吸盘', qty: 1, unit: '套', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      }
    ]
  },

  // ---- CWP03 窗台搁板款 ----
  {
    id: 'PROD_CWP03',
    parentAsin: 'B0FKSNWF4B',
    code: 'CWP03',
    name: '窗台搁板款猫窗台架',
    nameEn: 'Cat Perch for Window Sill',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP03_01', childAsin: 'B0CB1XSBFW', code: 'CWP03-深灰M', spec: '03M-灰色·M',
        bom: [
          { partType: 'cushion', partName: '03M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '03铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP03_02', childAsin: 'B0CB1YDRF3', code: 'CWP03-淡灰M', spec: '03M-灰色·M',
        bom: [
          { partType: 'cushion', partName: '03M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '03铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-橡胶木原色', qty: 2, variant: '橡胶木原色' },
        ]
      },
      {
        id: 'SKU_CWP03_03', childAsin: 'B0CB7ZCSWK', code: 'CWP03-浅棕M', spec: '03M-棕色·M',
        bom: [
          { partType: 'cushion', partName: '03M-棕色', qty: 1, variant: '棕色' },
          { partType: 'frame', partName: '03铁棒-M-阳光黑', qty: 1, variant: 'M-阳光黑' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-橡胶木原色', qty: 2, variant: '橡胶木原色' },
        ]
      },
      {
        id: 'SKU_CWP03_04', childAsin: 'B0CSVD1M45', code: 'CWP03-深棕M', spec: '03M-棕色·M',
        bom: [
          { partType: 'cushion', partName: '03M-棕色', qty: 1, variant: '棕色' },
          { partType: 'frame', partName: '03铁棒-M-阳光黑', qty: 1, variant: 'M-阳光黑' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP03_05', childAsin: 'B0FS781QXR', code: 'CWP03-灰色L', spec: '03L-灰色·L',
        bom: [
          { partType: 'cushion', partName: '03L-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '03铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-L', qty: 1, variant: 'L' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP03_06', childAsin: 'B0FS771C22', code: 'CWP03-浅棕L', spec: '03L-棕色·L',
        bom: [
          { partType: 'cushion', partName: '03L-棕色', qty: 1, variant: '棕色' },
          { partType: 'frame', partName: '03铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-L', qty: 1, variant: 'L' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      }
    ]
  },

  // ---- CWP04 ----
  {
    id: 'PROD_CWP04',
    parentAsin: 'B0CRVNH64J',
    code: 'CWP04',
    name: '猫窗台架（其他款）',
    nameEn: 'Cat Window Perch - Variant',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP04_01', childAsin: 'B0CSDXD3BHZ', code: 'CWP04-杂色', spec: '04-杂色',
        bom: [
          { partType: 'cushion', partName: '04-杂色', qty: 1, variant: '杂色' },
          { partType: 'frame', partName: '04铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '02吸盘', qty: 1, unit: '套(每盒4个螺杆吸盘)', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '01整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP04_02', childAsin: 'B0C0QYV12D', code: 'CWP04-杂棕', spec: '04-杂棕色',
        bom: [
          { partType: 'cushion', partName: '04-杂棕色', qty: 1, variant: '杂棕色' },
          { partType: 'frame', partName: '04铁架', qty: 1, variant: '标准' },
          { partType: 'suction', partName: '02吸盘', qty: 1, unit: '套(每盒4个螺杆吸盘)', variant: '标准' },
          { partType: 'plastic', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '01整套配件', qty: 2, variant: '标准' },
        ]
      }
    ]
  },

  // ---- CWP07 M码 ----
  {
    id: 'PROD_CWP07',
    parentAsin: 'B0DDQ48GWH',
    code: 'CWP07',
    name: '猫窗台架（升级款）',
    nameEn: 'Cat Window Perch - Upgraded',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP07_01', childAsin: 'B0DDPX95ZJ', code: 'CWP07-灰色M', spec: '07M-灰色',
        bom: [
          { partType: 'cushion', partName: '07M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '07铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '松木实木配件', qty: 2, variant: '标准' },
          { partType: 'wood', partName: '松木刚棚实木配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP07_02', childAsin: 'B0DDPWNDF01', code: 'CWP07-浅棕M', spec: '07M-浅棕色',
        bom: [
          { partType: 'cushion', partName: '07M-浅棕色', qty: 1, variant: '浅棕色' },
          { partType: 'frame', partName: '07铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '松木实木配件', qty: 2, variant: '标准' },
          { partType: 'wood', partName: '松木刚棚实木配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP07_03', childAsin: 'B0DDPWW5Q6', code: 'CWP07-淡灰M', spec: '07M-灰色',
        bom: [
          { partType: 'cushion', partName: '07M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '07铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '木头原色实木配件', qty: 2, variant: '原色' },
          { partType: 'wood', partName: '木头原色刚棚实木', qty: 2, variant: '原色' },
        ]
      },
      {
        id: 'SKU_CWP07_04', childAsin: 'B0DDPX1Z3R', code: 'CWP07-深灰M', spec: '07M-深灰色',
        bom: [
          { partType: 'cushion', partName: '07M-深灰色', qty: 1, variant: '深灰色' },
          { partType: 'frame', partName: '07铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '松木实木配件', qty: 2, variant: '标准' },
          { partType: 'wood', partName: '松木刚棚实木配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP07_05', childAsin: 'B0DDPVNM66N', code: 'CWP07-浅白M', spec: '07M-白色',
        bom: [
          { partType: 'cushion', partName: '07M-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '07铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '松木实木配件', qty: 2, variant: '标准' },
          { partType: 'wood', partName: '松木刚棚实木配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP07_06', childAsin: 'B0DDPYYM4P', code: 'CWP07-浅色M', spec: '07M-浅色',
        bom: [
          { partType: 'cushion', partName: '07M-浅色', qty: 1, variant: '浅色' },
          { partType: 'frame', partName: '07铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '松木实木配件', qty: 2, variant: '标准' },
          { partType: 'wood', partName: '松木刚棚实木配件', qty: 2, variant: '标准' },
        ]
      }
    ]
  },

  // ---- CWP07L ----
  {
    id: 'PROD_CWP07L',
    parentAsin: 'B0DVSYQ6LW',
    code: 'CWP07(L)',
    name: 'CWP07 L码变体',
    nameEn: 'Cat Window Perch - Upgraded L',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP07L_01', childAsin: 'B0DLW1X2PC', code: 'CWP07-灰色L-2个', spec: '07L-灰色·M×2个',
        bom: [
          { partType: 'cushion', partName: '07M-灰色', qty: 2, variant: '灰色' },
          { partType: 'frame', partName: '07铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '松木实木配件-L', qty: 2, variant: 'L' },
          { partType: 'wood', partName: '松木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP07L_02', childAsin: 'B0DPSCQBR5', code: 'CWP07-浅棕L', spec: '07L-浅棕色',
        bom: [
          { partType: 'cushion', partName: '07L-浅棕色', qty: 1, variant: '浅棕色' },
          { partType: 'frame', partName: '07铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '松木实木配件-L', qty: 2, variant: 'L' },
          { partType: 'wood', partName: '松木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP07L_03', childAsin: 'B0DLW1BXWM6', code: 'CWP07-深棕L-2个', spec: '07L-深棕色×2个',
        bom: [
          { partType: 'cushion', partName: '07M-深棕色', qty: 2, variant: '深棕色' },
          { partType: 'frame', partName: '07铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '松木实木配件-L', qty: 2, variant: 'L' },
          { partType: 'wood', partName: '松木刚棚实木-L', qty: 2, variant: 'L' },
        ]
      },
      {
        id: 'SKU_CWP07L_04', childAsin: 'B0DLV2T7N3', code: 'CWP07-浅色L-2个', spec: '07L-浅色×2个',
        bom: [
          { partType: 'cushion', partName: '07M-浅色', qty: 2, variant: '浅色' },
          { partType: 'frame', partName: '07铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '松木实木配件-L', qty: 2, variant: 'L' },
          { partType: 'wood', partName: '松木刚棚实木-L', qty: 2, variant: 'L' },
        ]
      },
      {
        id: 'SKU_CWP07L_05', childAsin: 'B0DLW37BTW', code: 'CWP07-浅白L-2个', spec: '07L-白色×2个',
        bom: [
          { partType: 'cushion', partName: '07N-白色', qty: 2, variant: '白色' },
          { partType: 'frame', partName: '07铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '松木实木配件-L', qty: 2, variant: 'L' },
          { partType: 'wood', partName: '松木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
    ]
  },

  // ---- CWP08 孔盘款 ----
  {
    id: 'PROD_CWP08',
    parentAsin: 'B0F1SFBSCFX',
    code: 'CWP08',
    name: '孔盘款猫窗台架',
    nameEn: 'Cat Window Perch - Disc Mount',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP08_01', childAsin: 'B0F9FD3115', code: 'CWP08-N-白色', spec: '08N-白色',
        bom: [
          { partType: 'cushion', partName: '08M-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '08M铁架', qty: 1, variant: 'M' },
          { partType: 'disc', partName: '02孔盘', qty: 1, variant: '标准' },
          { partType: 'packaging', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP08_02', childAsin: 'B0F1SFB86V6', code: 'CWP08-L-白色', spec: '08L-白色',
        bom: [
          { partType: 'cushion', partName: '08L-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '08L铁架', qty: 1, variant: 'L' },
          { partType: 'disc', partName: '02孔盘', qty: 1, variant: '标准' },
          { partType: 'packaging', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP08_03', childAsin: 'B0F9FGJL7C', code: 'CWP08-L-灰色', spec: '08L-灰色',
        bom: [
          { partType: 'cushion', partName: '08L-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '08L铁架', qty: 1, variant: 'L' },
          { partType: 'disc', partName: '02孔盘', qty: 1, variant: '标准' },
          { partType: 'packaging', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP08_04', childAsin: 'B0FNCVB6YF', code: 'CWP08-L-棕色', spec: '08L-棕色',
        bom: [
          { partType: 'cushion', partName: '08L-棕色', qty: 1, variant: '棕色' },
          { partType: 'frame', partName: '08L铁架', qty: 1, variant: 'L' },
          { partType: 'disc', partName: '02孔盘', qty: 1, variant: '标准' },
          { partType: 'packaging', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP08_05', childAsin: 'B0FNCV5DZJ', code: 'CWP08-M-杂色', spec: '08M-杂色',
        bom: [
          { partType: 'cushion', partName: '08M-杂色', qty: 1, variant: '杂色' },
          { partType: 'frame', partName: '08M铁架', qty: 1, variant: 'M' },
          { partType: 'disc', partName: '02孔盘', qty: 1, variant: '标准' },
          { partType: 'packaging', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CWP08_06', childAsin: 'B0F1SFA6VY5', code: 'CWP08-M-灰色', spec: '08M-灰色',
        bom: [
          { partType: 'cushion', partName: '08M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '08M铁架', qty: 1, variant: 'M' },
          { partType: 'disc', partName: '02孔盘', qty: 1, variant: '标准' },
          { partType: 'packaging', partName: '白色塑料', qty: 1, variant: '白色' },
          { partType: 'packaging', partName: '03整套配件', qty: 2, variant: '标准' },
        ]
      }
    ]
  },

  // ---- CWP09 最新款 ----
  {
    id: 'PROD_CWP09',
    parentAsin: 'B0F9FQHQ77',
    code: 'CWP09',
    name: '最新款猫窗台架',
    nameEn: 'Cat Window Perch - Latest',
    category: '猫窗台架',
    type: 'assembled',
    status: 'active',
    skus: [
      {
        id: 'SKU_CWP09_01', childAsin: 'B0F9FMKC7M5', code: 'CWP09-浅白M', spec: '09M-白色·M',
        bom: [
          { partType: 'cushion', partName: '09M-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_02', childAsin: 'B0F9FNHCLQ', code: 'CWP09-浅白L', spec: '09M-白色·L',
        bom: [
          { partType: 'cushion', partName: '09M-白色', qty: 1, variant: '白色' },
          { partType: 'frame', partName: '09铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-L', qty: 1, variant: 'L' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_03', childAsin: 'B0FND039KD', code: 'CWP09-灰色M', spec: '09M-灰色',
        bom: [
          { partType: 'cushion', partName: '09M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_04', childAsin: 'B0FND6P1RD', code: 'CWP09-浅棕L', spec: '09-浅棕L',
        bom: [
          { partType: 'cushion', partName: '09L-浅棕', qty: 1, variant: '浅棕' },
          { partType: 'frame', partName: '09铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-L-阳光黑', qty: 1, variant: 'L-阳光黑' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_05', childAsin: 'B0F9FR4V53', code: 'CWP09-灰色L', spec: '09-灰色L',
        bom: [
          { partType: 'cushion', partName: '09L-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M-阳光黑', qty: 1, variant: 'M-阳光黑' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_06', childAsin: 'B0FND8S2P4', code: 'CWP09-深棕M', spec: '09-深棕M',
        bom: [
          { partType: 'cushion', partName: '09M-深棕', qty: 1, variant: '深棕' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_07', childAsin: 'B0F91FLN1ZZ', code: 'CWP09-深棕L', spec: '09-深棕L',
        bom: [
          { partType: 'cushion', partName: '09L-深棕', qty: 1, variant: '深棕' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M', qty: 1, variant: 'M' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_08', childAsin: 'B0F9FPW3MM', code: 'CWP09-浅灰M', spec: '09-浅灰M',
        bom: [
          { partType: 'cushion', partName: '09M-浅灰', qty: 1, variant: '浅灰' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_09', childAsin: 'B0FND4QJPW', code: 'CWP09-浅色M', spec: '09-浅色M',
        bom: [
          { partType: 'cushion', partName: '09M-浅色', qty: 1, variant: '浅色' },
          { partType: 'frame', partName: '09铁棒-L-白色', qty: 1, variant: 'L-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-L', qty: 1, variant: 'L' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      },
      {
        id: 'SKU_CWP09_10', childAsin: 'B0F9FPPK6C', code: 'CWP09-灰色M2', spec: '09-灰色M',
        bom: [
          { partType: 'cushion', partName: '09M-灰色', qty: 1, variant: '灰色' },
          { partType: 'frame', partName: '09铁棒-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-M-白色', qty: 1, variant: 'M-白色' },
          { partType: 'wood', partName: '橡胶木实木配件-原木色', qty: 2, variant: '原木色' },
        ]
      }
    ]
  },

  // ---- CSP001 猫抓板 ----
  {
    id: 'PROD_CSP001',
    parentAsin: 'B0DVSYB3W',
    code: 'CSP001',
    name: '猫抓板系列',
    nameEn: 'Cat Scratch Pad',
    category: '猫抓板',
    type: 'simple',
    status: 'active',
    skus: [
      {
        id: 'SKU_CSP001_01', childAsin: 'B0DPM6D3TRB', code: 'CSP001-猫抓板大号', spec: '猫抓板大号·1套',
        bom: [
          { partType: 'packaging', partName: '猫抓板中号·1套', qty: 1, variant: '标准' },
        ]
      },
      {
        id: 'SKU_CSP001_02', childAsin: 'B0DP6DC2ZQ', code: 'CSP002-猫抓板中号', spec: '猫抓板中号·1套',
        bom: [
          { partType: 'packaging', partName: '猫抓板中号·1套', qty: 1, variant: '标准' },
        ]
      }
    ]
  },

  // ---- 替换垫子01 ----
  {
    id: 'PROD_PAD01',
    parentAsin: 'B099SLT1R',
    code: '替换垫子01',
    name: '替换垫子（经典款）',
    nameEn: 'Replacement Cushion 01',
    category: '配件',
    type: 'accessory',
    status: 'active',
    skus: [
      {
        id: 'SKU_PAD01_01', childAsin: 'B099HHQRV', code: '替换垫子01-白色', spec: '01-白色',
        bom: [{ partType: 'cushion', partName: '01-白色垫子', qty: 1, variant: '白色' }]
      },
      {
        id: 'SKU_PAD01_02', childAsin: 'B0995K4P73', code: '替换垫子01-灰色', spec: '01-灰色',
        bom: [{ partType: 'cushion', partName: '01-灰色垫子', qty: 1, variant: '灰色' }]
      }
    ]
  },

  // ---- 替换垫子03 ----
  {
    id: 'PROD_PAD03',
    parentAsin: 'B0DG9WLXB',
    code: '替换垫子03',
    name: '替换垫子（搁板款）',
    nameEn: 'Replacement Cushion 03',
    category: '配件',
    type: 'accessory',
    status: 'active',
    skus: [
      {
        id: 'SKU_PAD03_01', childAsin: 'B0D5M68JCW', code: '替换垫子03-灰色M', spec: '03M-灰色',
        bom: [{ partType: 'cushion', partName: '03-灰色垫子-M', qty: 1, variant: '灰色M' }]
      },
      {
        id: 'SKU_PAD03_02', childAsin: 'B0D3M0R2N5', code: '替换垫子03-灰色M2', spec: '03-灰色-M',
        bom: [{ partType: 'cushion', partName: '03-灰色垫子-M', qty: 1, variant: '灰色M' }]
      }
    ]
  },

  // ---- 替换吸盘01 ----
  {
    id: 'PROD_SUC01',
    parentAsin: 'B09PHC8CL',
    code: '替换吸盘01',
    name: '替换吸盘',
    nameEn: 'Replacement Suction Cups 01',
    category: '配件',
    type: 'accessory',
    status: 'active',
    skus: [{
      id: 'SKU_SUC01_01', childAsin: 'B09PHC8CL', code: '替换吸盘01', spec: '01吸盘·1套(每袋4个吸盘)',
      bom: [{ partType: 'suction', partName: '01吸盘', qty: 1, unit: '套', variant: '标准' }]
    }]
  },

  // ---- 替换吸盘02 ----
  {
    id: 'PROD_SUC02',
    parentAsin: 'B0C572C33B',
    code: '替换吸盘02',
    name: '替换螺杆吸盘',
    nameEn: 'Replacement Screw Suction Cups',
    category: '配件',
    type: 'accessory',
    status: 'active',
    skus: [{
      id: 'SKU_SUC02_01', childAsin: 'B0C572C33B', code: '替换吸盘02', spec: '02螺杆吸盘·1盒(每盒4个螺杆吸盘)',
      bom: [{ partType: 'suction', partName: '02螺杆吸盘', qty: 1, unit: '盒', variant: '标准' }]
    }]
  }
]

/**
 * 获取所有统计信息
 */
export function getProductStats() {
  const totalListings = products.length
  const totalSkus = products.reduce((sum, p) => sum + p.skus.length, 0)
  const assembled = products.filter(p => p.type === 'assembled').length
  const accessories = products.filter(p => p.type === 'accessory').length
  const simple = products.filter(p => p.type === 'simple').length

  // 统计所有唯一配件
  const allParts = new Set()
  products.forEach(p => p.skus.forEach(s => s.bom.forEach(b => allParts.add(b.partName))))

  return { totalListings, totalSkus, assembled, accessories, simple, totalParts: allParts.size }
}
