const { callApi } = require('../../../utils/api')

Page({
  data: {
    supplier: null
  },

  onLoad(options) {
    this.orgId = options.id
    this.loadData()
  },

  async loadData() {
    try {
      const supplier = await callApi('organization.detail', { id: this.orgId })
      this.setData({
        supplier: {
          name: supplier.name || '',
          creditCode: supplier.credit_code || '-',
          legalPerson: supplier.legal_person || '-',
          phone: supplier.contact_phone || '-',
          address: supplier.address || '-',
          hasAssembly: supplier.has_assembly,
          bankName: supplier.bank_info?.bank_name || '-',
          bankAccount: supplier.bank_info?.bank_account || '-',
          bankBranch: supplier.bank_info?.bank_branch || '-',
          cooperationNote: supplier.cooperation_note || '暂无'
        }
      })
      wx.setNavigationBarTitle({ title: supplier.name || '供应商详情' })
    } catch (error) {
      wx.showToast({ title: error.message || '加载供应商详情失败', icon: 'none' })
    }
  }
})
