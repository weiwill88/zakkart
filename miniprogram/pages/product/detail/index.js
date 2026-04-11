const { callApi } = require('../../../utils/api')

Page({
  data: { product: {} },

  onLoad(options) {
    this.productId = options.id
    this.loadData()
  },

  async loadData() {
    try {
      const product = await callApi('product.detail', { id: this.productId })
      const bomMap = {}
      ;(product.skus || []).forEach((sku) => {
        ;(sku.bom_items || []).forEach((bom) => {
          const key = bom.part_type_id || bom.part_name
          if (!bomMap[key]) {
            bomMap[key] = {
              partId: key,
              name: bom.part_name || '',
              qty: bom.quantity || 0,
              supplier: bom.supplier_name || bom.supplier_org_name || '-',
              variants: [],
              note: ''
            }
          }
          bomMap[key].variants.push(sku.spec || sku.sku_id)
        })
      })

      const normalized = {
        name: product.name_cn || '',
        nameEn: product.name_en || '',
        code: product.code || '',
        category: product.category || '-',
        asin: product.parent_asin || '-',
        skus: (product.skus || []).map((sku) => ({
          id: sku.sku_id,
          code: sku.child_asin || sku.sku_id,
          spec: sku.spec || '',
          stock: 0
        })),
        bom: Object.values(bomMap)
      }

      this.setData({ product: normalized })
      wx.setNavigationBarTitle({ title: `${normalized.code} ${normalized.name}` })
    } catch (error) {
      wx.showToast({ title: error.message || '加载产品详情失败', icon: 'none' })
    }
  }
})
