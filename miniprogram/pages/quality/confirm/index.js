const { qualityInspections } = require('../../../utils/mock-data')
const { showToast } = require('../../../utils/util')

Page({
  data: {
    qc: {},
    verdict: '',             // pass / partial / reject
    passedQty: 0,
    defectQty: 0,
    defectDescription: '',
    defectHandling: '',      // rework / discount / destroy / supplement
    reportNote: '',
    verdictBtnText: '请先选择验货结论',
    verdictBtnClass: 'btn-ghost',
    defectTypes: [
      { key: 'crack', name: '裂纹/开裂', icon: '⚡', checked: false },
      { key: 'color', name: '色差', icon: '🎨', checked: false },
      { key: 'size', name: '尺寸偏差', icon: '📐', checked: false },
      { key: 'hole', name: '孔位偏移', icon: '🔩', checked: false },
      { key: 'surface', name: '表面瑕疵', icon: '🔍', checked: false },
      { key: 'missing', name: '配件缺失', icon: '📦', checked: false },
      { key: 'other', name: '其他', icon: '📝', checked: false }
    ]
  },

  onLoad(options) {
    const qc = qualityInspections.find(q => q.id === options.id)
    if (qc) {
      this.setData({ qc, passedQty: qc.passedQty || qc.totalQty })
    }
  },

  setVerdict(e) {
    const v = e.currentTarget.dataset.v
    let btnText, btnClass
    if (v === 'pass') { btnText = '确认：全部通过'; btnClass = 'btn-success' }
    else if (v === 'partial') { btnText = '确认：部分通过'; btnClass = 'btn-warning' }
    else { btnText = '确认：全部不通过'; btnClass = 'btn-danger' }
    this.setData({ verdict: v, verdictBtnText: btnText, verdictBtnClass: btnClass })
    if (v === 'pass') {
      this.setData({ passedQty: this.data.qc.totalQty, defectQty: 0 })
    }
  },

  onPassedChange(e) {
    const passed = parseInt(e.detail.value) || 0
    this.setData({ passedQty: passed, defectQty: Math.max(0, this.data.qc.totalQty - passed) })
  },

  toggleDefectType(e) {
    const key = e.currentTarget.dataset.key
    const types = this.data.defectTypes.map(t => t.key === key ? { ...t, checked: !t.checked } : t)
    this.setData({ defectTypes: types })
  },

  setHandling(e) {
    this.setData({ defectHandling: e.currentTarget.dataset.h })
  },

  onDefectDescInput(e) {
    this.setData({ defectDescription: e.detail.value })
  },

  onUpload() {
    showToast('原型演示：正式版将支持拍照/录像上传')
  },

  onSubmit() {
    if (!this.data.verdict) {
      showToast('请先选择验货结论')
      return
    }
    const v = this.data.verdict
    let msg = ''
    if (v === 'pass') msg = '验货通过！供应商将收到通知可安排发货。'
    else if (v === 'partial') msg = `部分通过！合格品 ${this.data.passedQty} 件可先行发货，次品 ${this.data.defectQty} 件按所选方案处理。`
    else msg = `验货不通过！次品 ${this.data.defectQty} 件按所选方案处理，供应商将收到返工通知。`

    wx.showModal({
      title: '确认提交验货结论',
      content: msg,
      success: (res) => {
        if (res.confirm) {
          showToast('原型演示：验货结论已提交')
          setTimeout(() => wx.navigateBack(), 1500)
        }
      }
    })
  }
})