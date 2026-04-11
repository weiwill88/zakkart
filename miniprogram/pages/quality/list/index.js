const { callApi } = require('../../../utils/api')
const { getInspectionStatusLabel, getInspectionStatusClass } = require('../../../utils/status')

Page({
  data: {
    activeTab: 'all',
    productionList: [],
    allList: [],
    filteredList: [],
    isAdmin: false,
    isSupplier: false,
    canMarkProduced: false,
    canInspect: false,
    emptyText: '暂无验货记录'
  },

  onLoad() {
    if (!this.ensureAccess()) return
    this.loadData()
  },

  onShow() {
    if (!this.ensureAccess()) return
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'production' })
    }
    this.loadData()
  },

  ensureAccess() {
    const app = getApp()
    const role = app.getRole()
    if (role === 'admin' && !app.getAdminModuleAccess().quality) {
      wx.showToast({ title: '当前账号没有质检模块权限', icon: 'none' })
      wx.reLaunch({ url: '/pages/home/admin/index' })
      return false
    }
    if ((role === 'supplier' || role === 'supplier_worker') && !app.getSupplierModuleAccess().production) {
      wx.showToast({ title: '当前账号没有生产与验货模块权限', icon: 'none' })
      wx.reLaunch({ url: '/pages/home/supplier/index' })
      return false
    }
    return true
  },

  async loadData() {
    const app = getApp()
    const isAdmin = app.getRole() === 'admin'
    const isSupplier = !isAdmin
    const canMarkProduced = app.hasPermission('mark_produced')
    const canInspect = isAdmin && app.getAdminModuleAccess().quality

    try {
      const [result, contractResult] = await Promise.all([
        callApi('inspection.list', { status: 'all' }),
        callApi('contract.list', { page: 1, pageSize: 100 }).catch(() => ({ list: [] }))
      ])
      const contracts = contractResult.list || []
      const batchResults = await Promise.all(
        contracts.map(contract => callApi('batch.list', { contractId: contract._id }).catch(() => ({ list: [] })))
      )
      const productionList = batchResults.flatMap(resultItem => {
        return (resultItem.list || []).flatMap(batch => {
          return (batch.parts || [])
            .filter(part => part.status === 'PENDING_PRODUCTION')
            .map(part => ({
              id: part.part_id,
              partName: part.part_name,
              batchNo: `第 ${batch.batch_no} 批`,
              planDate: batch.planned_date || '--',
              plannedQty: Number(part.planned_qty || 0)
            }))
        })
      })

      const allList = (result.list || []).map(item => {
        const passedQty = Number(item.latestInspection?.qualified_qty || 0)
        const defectQty = Number(item.latestInspection?.defect_qty || 0)
        const totalQty = Number(item.actualQty || item.plannedQty || 0)
        return {
          id: item.batchPartId,
          inspectDate: formatDate(item.latestInspection?.inspected_at || item.statusUpdatedAt),
          partName: item.partName,
          supplierName: item.supplierName,
          contractNo: item.contractNo,
          batchNo: `第 ${item.batchNo} 批`,
          totalQty,
          passedQty,
          defectQty,
          passRate: totalQty > 0 ? Math.round((passedQty / totalQty) * 100) : 0,
          status: item.displayStatus,
          statusLabel: getInspectionStatusLabel(item.displayStatus, item.latestInspection?.result),
          badgeClass: getInspectionStatusClass(item.displayStatus, item.latestInspection?.result)
        }
      })

      this.setData({
        productionList,
        allList,
        filteredList: filterList(allList, this.data.activeTab),
        isAdmin,
        isSupplier,
        canMarkProduced,
        canInspect,
        emptyText: getEmptyText(this.data.activeTab, isAdmin)
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载质检列表失败', icon: 'none' })
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      filteredList: filterList(this.data.allList, tab),
      emptyText: getEmptyText(tab, this.data.isAdmin)
    })
  },

  goToDetail(e) {
    wx.navigateTo({ url: `/pages/quality/detail/index?id=${e.currentTarget.dataset.id}` })
  },

  onMarkProduced(e) {
    const { id, qty } = e.currentTarget.dataset
    if (!this.data.canMarkProduced) {
      wx.showToast({ title: '当前账号没有标记已生产权限', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认标记',
      content: '标记后管理员将安排验货，验货通过后才可进入发货阶段。',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await callApi('status.markProduced', {
            batchPartId: id,
            actualQty: Number(qty || 0)
          })
          wx.showToast({ title: '已标记为待验货', icon: 'success' })
          this.loadData()
        } catch (error) {
          wx.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
    })
  },

  goToConfirm(e) {
    const id = e.currentTarget.dataset.id || ''
    if (!id) return
    wx.navigateTo({ url: `/pages/quality/detail/index?id=${id}` })
  },

  onArrangeQC(e) {
    const id = e.currentTarget.dataset.id || ''
    if (!id) return
    wx.navigateTo({ url: `/pages/quality/detail/index?id=${id}` })
  }
})

function filterList(list, tab) {
  if (tab === 'all') return list
  if (tab === 'pending') return list.filter(item => item.status === 'PENDING_INSPECTION')
  if (tab === 'done') return list.filter(item => item.status !== 'PENDING_INSPECTION')
  return list
}

function formatDate(value) {
  if (!value) return '待安排'
  return String(value).slice(0, 10).replace(/-/g, '/')
}

function getEmptyText(tab, isAdmin) {
  if (tab === 'pending') {
    return isAdmin ? '暂无待验货任务' : '暂无待查看的验货任务'
  }
  if (tab === 'done') {
    return '暂无已完成的验货记录'
  }
  return '暂无验货记录'
}
