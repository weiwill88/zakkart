const { packingRecords } = require('../../../utils/mock-data')
const { showToast } = require('../../../utils/util')

Page({
  data: {
    skuOptions: [
      { label: '03M-深灰（窗台搁板款猫窗台架）', value: '03M-深灰' },
      { label: '03M-浅灰（窗台搁板款猫窗台架）', value: '03M-浅灰' },
      { label: '03M-深棕（窗台搁板款猫窗台架）', value: '03M-深棕' },
      { label: '03L-浅灰（窗台搁板款猫窗台架）', value: '03L-浅灰' },
      { label: '03L-浅棕（窗台搁板款猫窗台架）', value: '03L-浅棕' }
    ],
    selectedSku: '',
    packQty: '',
    bomItems: [],
    records: []
  },
  onLoad() {
    this.setData({ records: packingRecords })
  },
  onSkuChange(e) {
    const selected = this.data.skuOptions[e.detail.value]
    this.setData({
      selectedSku: selected.label,
      bomItems: [
        { name: '垫子-03M-灰', unit: '件', consumeQty: this.data.packQty || 0, currentStock: 1200, stockEnough: true },
        { name: '铁棒套装-03M-深色', unit: '套', consumeQty: this.data.packQty || 0, currentStock: 480, stockEnough: true },
        { name: '实木-原木色', unit: '件', consumeQty: this.data.packQty || 0, currentStock: 2800, stockEnough: true }
      ]
    })
  },
  onQtyInput(e) {
    const qty = parseInt(e.detail.value) || 0
    const bomItems = this.data.bomItems.map(item => ({
      ...item, consumeQty: qty, stockEnough: item.currentStock >= qty
    }))
    this.setData({ packQty: e.detail.value, bomItems })
  },
  onSubmitPacking() {
    wx.showModal({
      title: '确认提交', content: '提交后系统将自动扣减配件库存并增加成品库存。',
      success: (res) => { if (res.confirm) { showToast('原型演示：包装记录已提交'); setTimeout(() => wx.navigateBack(), 1500) } }
    })
  }
})