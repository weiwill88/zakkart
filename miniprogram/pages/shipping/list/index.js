const { callApi } = require('../../../utils/api')
const { showToast } = require('../../../utils/util')
const { getShipmentStatusLabel, getShipmentStatusClass } = require('../../../utils/status')

Page({
  data: {
    activeTab: 'all',
    list: [],
    filteredList: [],
    loading: false,
    canCreate: false,
    readyShipmentCount: 0,
    pendingReceivingCount: 0
  },

  onLoad() {
    if (!this.ensureAccess()) return
    this.loadData()
  },

  onShow() {
    if (!this.ensureAccess()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'shipping' })
    }
    this.loadData()
  },

  ensureAccess() {
    const app = getApp()
    const role = app.getRole()
    if ((role === 'supplier' || role === 'supplier_worker') && !app.getSupplierModuleAccess().shipping) {
      showToast('当前账号没有发货与物流模块权限')
      wx.reLaunch({ url: '/pages/home/supplier/index' })
      return false
    }
    return true
  },

  async loadData() {
    const app = getApp()
    const role = app.getRole()
    const orgId = app.getUser()?.org?.id || ''
    this.setData({
      loading: true,
      canCreate: role === 'supplier' || role === 'supplier_worker'
        ? app.hasAnyPermission(['create_shipment']) || role === 'supplier'
        : false
    })

    try {
      const [shipmentResult, inspectionResult, receivingResult] = await Promise.all([
        callApi('shipment.list', { page: 1, pageSize: 100 }),
        callApi('inspection.list', { status: 'all' }),
        callApi('receiving.pending').catch(() => ({ list: [] }))
      ])

      const list = (shipmentResult.list || []).map(item => ({
        id: item._id,
        shipmentNo: item.shipment_no,
        shipperName: item.shipper_name,
        fromAddressLabel: item.from_address_label,
        toAddressLabel: item.to_address_label,
        status: item.status,
        statusLabel: getShipmentStatusLabel(item.status),
        statusClass: getShipmentStatusClass(item.status),
        plannedTotalQty: Number(item.planned_total_qty || 0),
        actualTotalQty: Number(item.actual_total_qty || 0),
        needConfirm: Boolean(item.need_confirm && !item.confirmed_at),
        isInbound: item.to_org_id === orgId,
        isOutbound: item.shipper_org_id === orgId,
        itemNames: (item.items || []).map(goods => goods.item_name).join('、')
      }))

      this.setData({
        list,
        readyShipmentCount: (inspectionResult.list || []).filter(item => item.currentStatus === 'PENDING_SHIPMENT').length,
        pendingReceivingCount: (receivingResult.list || []).length
      })
      this.applyFilter()
    } catch (error) {
      showToast(error.message || '加载发货列表失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
    this.applyFilter()
  },

  applyFilter() {
    const { activeTab, list } = this.data
    let filteredList = list
    if (activeTab === 'pending') {
      filteredList = list.filter(item => ['CREATED', 'VEHICLE_DISPATCHED'].includes(item.status))
    } else if (activeTab === 'transit') {
      filteredList = list.filter(item => item.status === 'IN_TRANSIT')
    } else if (activeTab === 'arrived') {
      filteredList = list.filter(item => item.status === 'ARRIVED')
    } else if (activeTab === 'receiving') {
      filteredList = list.filter(item => item.isInbound && item.status === 'IN_TRANSIT')
    }

    this.setData({ filteredList })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/shipping/create/index' })
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/shipping/detail/index?id=${id}` })
  }
})
