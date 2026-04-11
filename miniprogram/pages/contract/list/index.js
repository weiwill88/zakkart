const { callApi } = require('../../../utils/api')
const { calcProgress, formatNumber } = require('../../../utils/util')
const { getContractStatusLabel, getContractStatusClass, getSupplierConfirmStatusLabel, getSupplierConfirmStatusClass } = require('../../../utils/status')

Page({
  data: {
    activeTab: 'all',
    allContracts: [],
    filteredContracts: [],
    isAdmin: false,
    isSupplier: false
  },

  onLoad() {
    if (!this.ensureAccess()) return
    this.applyDefaultTab()
    this.loadData()
  },

  onShow() {
    if (!this.ensureAccess()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'contract' })
    }
    this.applyDefaultTab()
    this.loadData()
  },

  ensureAccess() {
    const app = getApp()
    const role = app.getRole()
    if ((role === 'supplier' || role === 'supplier_worker') && !app.getSupplierModuleAccess().contract) {
      wx.showToast({ title: '当前账号没有合同与交付模块权限', icon: 'none' })
      wx.reLaunch({ url: '/pages/home/supplier/index' })
      return false
    }
    return true
  },

  applyDefaultTab() {
    const app = getApp()
    const defaultTab = app.globalData.contractListDefaultTab || ''
    if (!defaultTab) return

    app.globalData.contractListDefaultTab = ''
    this.setData({ activeTab: defaultTab })
  },

  async loadData() {
    const app = getApp()
    const role = app.getRole()

    try {
      const result = await callApi('contract.list', { page: 1, pageSize: 100 })
      const contracts = result.list || []
      const batchResults = await Promise.all(
        contracts.map(contract => callApi('batch.list', { contractId: contract._id }).catch(() => ({ list: [] })))
      )

      const mapped = contracts.map((contract, index) => {
        const batches = batchResults[index].list || []
        const totalQty = getContractTotalQty(contract)
        const deliveredQty = batches.reduce((sum, batch) => {
          return sum + (batch.parts || []).reduce((partSum, part) => {
            if (['PENDING_SHIPMENT', 'VEHICLE_DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(part.status)) {
              return partSum + Number(part.actual_qty || part.planned_qty || 0)
            }
            return partSum
          }, 0)
        }, 0)

        return {
          id: contract._id,
          contractNo: contract.contract_no,
          productName: contract.product_name || '采购合同',
          supplierName: contract.supplier_name || '',
          totalQtyStr: formatNumber(totalQty),
          signDate: formatDate(contract.signed_at || contract.created_at),
          progress: calcProgress(deliveredQty, totalQty),
          status: contract.status,
          statusText: getContractStatusLabel(contract.status),
          statusClass: getContractStatusClass(contract.status),
          supplierConfirmStatus: contract.supplier_confirm_status || 'UNSENT',
          supplierConfirmText: getSupplierConfirmStatusLabel(contract.supplier_confirm_status),
          supplierConfirmClass: getSupplierConfirmStatusClass(contract.supplier_confirm_status),
          batches: batches.map(batch => ({
            id: batch._id,
            batchNo: `第${batch.batch_no}批`,
            statusLabel: getBatchStatusLabel(batch),
            statusType: getBatchStatusType(batch)
          }))
        }
      })

      this.setData({
        allContracts: mapped,
        filteredContracts: filterByTab(mapped, this.data.activeTab),
        isAdmin: role === 'admin',
        isSupplier: role === 'supplier' || role === 'supplier_worker'
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载合同失败', icon: 'none' })
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      filteredContracts: filterByTab(this.data.allContracts, tab)
    })
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/contract/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  goToCreate() {
    wx.showToast({ title: '小程序端暂不支持新建合同', icon: 'none' })
  }
})

function filterByTab(list, tab) {
  if (tab === 'all') return list
  if (tab === 'pending_confirm') return list.filter(item => item.supplierConfirmStatus === 'PENDING_CONFIRM')
  if (tab === 'in_progress') return list.filter(item => ['SIGNED', 'EXECUTING'].includes(item.status))
  if (tab === 'completed') return list.filter(item => item.status === 'COMPLETED')
  return list
}

function formatDate(value) {
  if (!value) return '--'
  return String(value).slice(0, 10).replace(/-/g, '/')
}

function getContractTotalQty(contract) {
  const productItems = Array.isArray(contract.product_items) ? contract.product_items : []
  if (productItems.length > 0) {
    return productItems.reduce((sum, item) => sum + Number(item.total_qty || 0), 0)
  }

  return (contract.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

function getBatchStatusLabel(batch) {
  const statuses = (batch.parts || []).map(part => part.status)
  if (statuses.every(status => status === 'ARRIVED')) return '已到达'
  if (statuses.some(status => status === 'IN_TRANSIT' || status === 'VEHICLE_DISPATCHED')) return '运输中'
  if (statuses.some(status => status === 'PENDING_SHIPMENT')) return '已验货待发货'
  if (statuses.some(status => status === 'PENDING_INSPECTION')) return '已生产待验货'
  return '待生产'
}

function getBatchStatusType(batch) {
  const statuses = (batch.parts || []).map(part => part.status)
  if (statuses.every(status => status === 'ARRIVED')) return 'completed'
  if (statuses.some(status => ['PENDING_SHIPMENT', 'VEHICLE_DISPATCHED', 'IN_TRANSIT'].includes(status))) return 'in-progress'
  if (statuses.some(status => status === 'PENDING_INSPECTION')) return 'in-progress'
  return 'pending'
}
