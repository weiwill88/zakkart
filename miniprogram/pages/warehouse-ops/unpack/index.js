const { showToast } = require('../../../utils/util')
Page({
  data: { selectedSku: '' },
  onSkuChange(e) { this.setData({ selectedSku: ['03M-深灰（窗台搁板款）','03M-浅灰（窗台搁板款）','03L-浅灰（窗台搁板款）'][e.detail.value] }) },
  onSubmit() { wx.showModal({ title: '确认拆包', content: '拆包将减少成品库存，增加配件库存。', success: (r) => { if (r.confirm) showToast('原型演示：拆包记录已提交') } }) }
})