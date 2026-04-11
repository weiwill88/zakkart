const { shipments, notifications } = require('../../../utils/mock-data')
const { showToast } = require('../../../utils/util')

Page({
  data: { user: {}, stats: {}, pendingShipments: [] },
  onLoad() { this.initData() },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'home' })
    }
  },
  initData() {
    const app = getApp()
    const user = app.getUser()
    const pending = shipments.filter(s => s.status === 'pending_logistics')
    const completed = shipments.filter(s => s.logisticsConfirmed)
    this.setData({ user, stats: { pendingConfirm: pending.length, completed: completed.length }, pendingShipments: pending })
  },
  goToShipments() { wx.navigateTo({ url: '/pages/shipping/list/index' }) },
  goToShipmentDetail(e) { wx.navigateTo({ url: `/pages/shipping/detail/index?id=${e.currentTarget.dataset.id}` }) },
  onConfirm(e) { showToast('原型演示：确认成功') }
})
