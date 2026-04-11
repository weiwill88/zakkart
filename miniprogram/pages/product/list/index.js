const { callApi } = require('../../../utils/api')

Page({
  data: { products: [] },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const result = await callApi('product.list', { page: 1, pageSize: 100 })
      const products = (result.list || []).map((item) => {
        const skus = item.skus || []
        const partIds = new Set()
        skus.forEach((sku) => {
          ;(sku.bom_items || []).forEach((bom) => {
            partIds.add(bom.part_type_id || bom.part_name)
          })
        })
        return {
          id: item._id,
          name: item.name_cn || '',
          nameEn: item.name_en || '',
          code: item.code || '',
          isSimple: item.type === 'simple',
          skuCount: skus.length,
          bomParts: partIds.size
        }
      })
      this.setData({ products })
    } catch (error) {
      wx.showToast({ title: error.message || '加载产品失败', icon: 'none' })
    }
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/product/detail/index?id=${e.currentTarget.dataset.id}` })
  }
})
