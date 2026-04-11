const { roleManager } = require('../../utils/role')

Page({
  data: { user: {}, currentRole: '', roleColor: '', supplierModuleAccess: {} },
  onLoad() { this.initData() },
  onShow() {
    this.initData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'settings' })
    }
  },
  initData() {
    const app = getApp()
    const user = app.getUser() || { name: '未登录', roleName: '', org: { name: '' } }
    const currentRole = app.getRole()
    this.setData({
      user,
      currentRole,
      roleColor: roleManager.getRoleColor(currentRole),
      supplierModuleAccess: app.getSupplierModuleAccess()
    })
  },
  goToProducts() { wx.navigateTo({ url: '/pages/product/list/index' }) },
  goToSuppliers() { wx.navigateTo({ url: '/pages/supplier-mgmt/list/index' }) },
  goToNotifications() { wx.navigateTo({ url: '/pages/notification/list/index' }) },
  goToOrgManage() { wx.navigateTo({ url: '/pages/org/manage/index' }) }
})
