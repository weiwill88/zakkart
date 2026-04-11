const { callApi } = require('../../../utils/api')

Page({
  data: { suppliers: [] },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    try {
      const [orgResult, contractResult] = await Promise.all([
        callApi('organization.list', { page: 1, pageSize: 100 }),
        callApi('contract.list', { page: 1, pageSize: 200 })
      ])

      const contractMap = {}
      ;(contractResult.list || []).forEach((item) => {
        const key = item.supplier_org_id
        if (!key) return
        if (!contractMap[key]) {
          contractMap[key] = { total: 0, executing: 0 }
        }
        contractMap[key].total += 1
        if (['SIGNED', 'EXECUTING'].includes(item.status)) {
          contractMap[key].executing += 1
        }
      })

      const suppliers = (orgResult.list || []).map((item) => {
        const stats = contractMap[item._id] || { total: 0, executing: 0 }
        return {
          id: item._id,
          name: item.name || '',
          contact: item.legal_person || '-',
          phone: item.contact_phone || '-',
          type: item.has_assembly ? '生产 + 组装' : '生产',
          address: item.address || '-',
          contracts: stats.total,
          activeContracts: stats.executing
        }
      })

      this.setData({ suppliers })
    } catch (error) {
      wx.showToast({ title: error.message || '加载供应商失败', icon: 'none' })
    }
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/supplier-mgmt/detail/index?id=${e.currentTarget.dataset.id}` })
  }
})
