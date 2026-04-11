const { shipments, inventory, packingRecords, outboundRecords } = require('../../../utils/mock-data')
const { showToast } = require('../../../utils/util')

Page({
  data: { user: {}, stats: {}, pendingReceive: [], inventoryItems: [] },
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
    const whId = user.warehouseId || 'WH001'
    const pending = shipments.filter(s => s.toWarehouseId === whId && !s.receiverConfirmed && s.logisticsConfirmed)
    const todayPacked = packingRecords.filter(p => p.warehouseId === whId && p.date === '2026/3/16').reduce((s, p) => s + p.qty, 0)
    const pendingOut = outboundRecords.filter(o => o.warehouseId === whId && o.status === 'pending_confirm')
    const invItems = inventory.finished.filter(i => i.warehouseId === whId)
    this.setData({ user, stats: { pendingReceive: pending.length, todayPacked, pendingOutbound: pendingOut.length }, pendingReceive: pending, inventoryItems: invItems })
  },
  goToShipmentDetail(e) { wx.navigateTo({ url: `/pages/shipping/detail/index?id=${e.currentTarget.dataset.id}` }) },
  goToPacking() { wx.navigateTo({ url: '/pages/warehouse-ops/packing/index' }) },
  goToUnpack() { wx.navigateTo({ url: '/pages/warehouse-ops/unpack/index' }) },
  goToOutbound() { wx.navigateTo({ url: '/pages/warehouse-ops/outbound/index' }) },
  goToInventory() { wx.switchTab({ url: '/pages/inventory/overview/index' }) },
  onReceiveConfirm() { showToast('原型演示：收货确认成功') }
})
