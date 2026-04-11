const { callApi } = require('../../../utils/api')
const { calcProgress, formatNumber } = require('../../../utils/util')

Page({
  data: {
    user: {},
    greeting: '',
    stats: {},
    todoItems: [],
    supplierProgress: [],
    lowStockItems: [],
    pendingQCItems: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateTabs()
      this.getTabBar().setData({ currentTab: 'home' })
    }
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const user = app.getUser()
    const greeting = getGreeting()

    try {
      const [contractResult, inspectionResult] = await Promise.all([
        callApi('contract.list', { page: 1, pageSize: 100 }),
        callApi('inspection.list', { status: 'all' })
      ])

      const contracts = contractResult.list || []
      const inspectionList = inspectionResult.list || []
      const executingContracts = contracts.filter((item) => ['SIGNED', 'EXECUTING'].includes(item.status))
      const batchResults = await Promise.all(
        executingContracts.map((contract) => callApi('batch.list', { contractId: contract._id }).catch(() => ({ list: [] })))
      )

      const supplierProgress = executingContracts.map((contract, index) => {
        const batches = batchResults[index].list || []
        const totalQty = (contract.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        const deliveredQty = batches.reduce((sum, batch) => {
          return sum + (batch.parts || []).reduce((partSum, part) => {
            if (['PENDING_SHIPMENT', 'VEHICLE_DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(part.status)) {
              return partSum + Number(part.actual_qty || part.planned_qty || 0)
            }
            return partSum
          }, 0)
        }, 0)

        const nextBatch = batches.find((batch) => (batch.parts || []).some((part) => part.status !== 'ARRIVED'))

        return {
          id: contract._id,
          contractNo: contract.contract_no,
          supplierName: contract.supplier_name,
          partName: contract.product_name,
          deliveredQty: formatNumber(deliveredQty),
          totalQty: formatNumber(totalQty),
          progress: calcProgress(deliveredQty, totalQty),
          statusText: contract.status === 'EXECUTING' ? '执行中' : '已签署',
          statusClass: 'badge-in-progress',
          nextBatchDate: nextBatch ? nextBatch.planned_date : '--',
          nextBatchDesc: nextBatch ? `第 ${nextBatch.batch_no} 批` : '全部完成'
        }
      })

      const pendingQCItems = inspectionList
        .filter((item) => item.currentStatus === 'PENDING_INSPECTION')
        .slice(0, 5)
        .map((item) => ({
          id: item.batchPartId,
          partName: item.partName,
          supplierName: item.supplierName,
          batchNo: `第 ${item.batchNo} 批`,
          totalQty: formatNumber(item.actualQty || item.plannedQty),
          passedQty: item.latestInspection?.qualified_qty || 0,
          defectQty: item.latestInspection?.defect_qty || 0
        }))

      const todoItems = buildTodoItems(contracts, inspectionList)

      this.setData({
        user,
        greeting,
        stats: {
          activeContracts: executingContracts.length,
          pendingShipments: 0,
          lowStockAlerts: 0,
          pendingQC: pendingQCItems.length
        },
        todoItems,
        supplierProgress,
        lowStockItems: [],
        pendingQCItems
      })
    } catch (error) {
      wx.showToast({ title: error.message || '加载工作台失败', icon: 'none' })
    }
  },

  goToContracts() { wx.switchTab({ url: '/pages/contract/list/index' }) },
  goToShipments() { wx.navigateTo({ url: '/pages/shipping/list/index' }) },
  goToInventory() { wx.switchTab({ url: '/pages/inventory/overview/index' }) },
  goToNotifications() { wx.navigateTo({ url: '/pages/notification/list/index' }) },
  goToContractDetail(e) { wx.navigateTo({ url: `/pages/contract/detail/index?id=${e.currentTarget.dataset.id}` }) },
  onTodoTap(e) {
    const item = e.currentTarget.dataset.item
    if (item.type === 'quality_arrange') wx.navigateTo({ url: '/pages/quality/list/index' })
    else if (item.type === 'contract_sign') wx.switchTab({ url: '/pages/contract/list/index' })
    else wx.navigateTo({ url: '/pages/notification/list/index' })
  },
  goToQuality() { wx.navigateTo({ url: '/pages/quality/list/index' }) },
  goToQCConfirm(e) { wx.navigateTo({ url: `/pages/quality/detail/index?id=${e.currentTarget.dataset.id}` }) }
})

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 18) return '晚上'
  if (hour >= 12) return '下午'
  return '上午'
}

function buildTodoItems(contracts, inspectionList) {
  const list = []
  const pendingSign = contracts.filter((item) => item.status === 'PENDING_SIGN')
  const confirmedPendingSign = pendingSign.filter((item) => item.supplier_confirm_status === 'CONFIRMED')
  const pendingInspection = inspectionList.filter((item) => item.currentStatus === 'PENDING_INSPECTION')

  if (pendingInspection.length > 0) {
    list.push({
      id: 'todo_inspection',
      type: 'quality_arrange',
      icon: '🔍',
      title: `${pendingInspection.length} 个配件待验货`,
      content: '供应商已标记生产完成，请尽快安排验货。',
      time: '当前',
      urgency: 'warning'
    })
  }

  if (confirmedPendingSign.length > 0) {
    list.push({
      id: 'todo_contract_confirmed',
      type: 'contract_sign',
      icon: '🖋️',
      title: `${confirmedPendingSign.length} 份合同已确认，待发起签约`,
      content: '供应商已在线确认内容无误，可去电子签平台发起签署。',
      time: '当前',
      urgency: 'info'
    })
  } else if (pendingSign.length > 0) {
    list.push({
      id: 'todo_contract_sign',
      type: 'contract_sign',
      icon: '📄',
      title: `${pendingSign.length} 份合同待确认/待签约`,
      content: '等待供应商确认内容，或线下完成电子签并上传 PDF。',
      time: '当前',
      urgency: 'info'
    })
  }

  if (list.length === 0) {
    list.push({
      id: 'todo_idle',
      type: 'idle',
      icon: '✅',
      title: '当前没有待办事项',
      content: '阶段 2 / 3 的合同与验货主链路已同步。',
      time: '当前',
      urgency: 'normal'
    })
  }

  return list
}
