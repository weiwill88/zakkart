const { outboundRecords } = require('../../../utils/mock-data')
const { showToast } = require('../../../utils/util')
const { validateOutboundForm } = require('../../../utils/outbound-form')

Page({
  data: {
    skuOptions: [
      { label: '03M-深灰（窗台搁板款）', value: '03M-深灰', stock: 320 },
      { label: '03M-浅灰（窗台搁板款）', value: '03M-浅灰', stock: 280 },
      { label: '03M-深棕（窗台搁板款）', value: '03M-深棕', stock: 150 },
      { label: '03L-浅灰（窗台搁板款）', value: '03L-浅灰', stock: 200 },
      { label: '03L-浅棕（窗台搁板款）', value: '03L-浅棕', stock: 85 }
    ],
    selectedSku: '', currentStock: -1, outboundQty: '', destination: '', records: [], isAdmin: false
  },
  onLoad() {
    const app = getApp()
    this.setData({ records: outboundRecords, isAdmin: app.getRole() === 'admin' })
  },
  onSkuChange(e) {
    const item = this.data.skuOptions[e.detail.value]
    this.setData({ selectedSku: item.label, currentStock: item.stock })
  },
  onQtyInput(e) {
    this.setData({ outboundQty: e.detail.value })
  },
  onDestinationInput(e) {
    this.setData({ destination: e.detail.value })
  },
  onSubmit() {
    const message = validateOutboundForm(this.data)
    if (message) {
      showToast(message)
      return
    }
    wx.showModal({ title: '确认提交', content: '出库单提交后将等待管理员确认。', success: (res) => { if (res.confirm) showToast('原型演示：出库单已提交') } })
  },
  onConfirmOutbound() { showToast('原型演示：出库已确认，库存已更新') }
})
