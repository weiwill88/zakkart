const { callApi } = require('../../../utils/api')

Page({
  data: {
    activeTab: 'finished',
    loading: false,
    selectedOrgId: '',
    orgOptions: [],
    allFinished: [],
    allParts: [],
    filteredFinished: [],
    filteredParts: []
  },

  onLoad() {
    if (!this.ensureAccess()) return
    this.loadData()
  },

  onShow() {
    if (!this.ensureAccess()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'inventory' })
    }
    this.loadData()
  },

  ensureAccess() {
    const app = getApp()
    if (app.getRole() !== 'admin' || !app.getAdminModuleAccess().inventory) {
      wx.showToast({ title: '当前账号没有库存模块权限', icon: 'none' })
      wx.reLaunch({ url: '/pages/home/admin/index' })
      return false
    }
    return true
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const result = await callApi('inventory.list', {
        orgId: this.data.selectedOrgId
      })
      const list = Array.isArray(result.list) ? result.list : []
      const finished = list
        .filter((item) => item.item_type === 'product')
        .map((item) => ({
          id: item._id,
          itemName: item.item_name || '未命名 SKU',
          orgName: item.org_name || '未命名组装厂',
          finishedQty: Number(item.finished_qty || 0),
          semiQty: Number(item.semi_qty || 0),
          wipQty: Number(item.wip_qty || 0)
        }))
      const parts = list
        .filter((item) => item.item_type === 'part')
        .map((item) => ({
          id: item._id,
          itemName: item.item_name || '未命名配件',
          orgName: item.org_name || '未命名组装厂',
          finishedQty: Number(item.finished_qty || 0),
          semiQty: Number(item.semi_qty || 0),
          wipQty: Number(item.wip_qty || 0)
        }))

      this.setData({
        orgOptions: result.assemblyOrgs || [],
        allFinished: finished,
        allParts: parts,
        filteredFinished: finished,
        filteredParts: parts
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载库存失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  async filterWarehouse(e) {
    this.setData({ selectedOrgId: e.currentTarget.dataset.orgId || '' })
    await this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  }
})
