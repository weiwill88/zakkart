const { callApi } = require('../../../utils/api')
const { calcProgress, formatNumber, showToast } = require('../../../utils/util')
const { getContractStatusLabel, getContractStatusClass, getInspectionStatusLabel, getInspectionStatusClass } = require('../../../utils/status')

Page({
  data: {
    user: {},
    isWorker: false,
    canMarkProduced: false,
    canCreateShipment: false,
    moduleAccess: {},
    moduleCards: [],
    stats: {},
    todoItems: [],
    myContracts: [],
    recentContracts: [],
    qcItems: [],
    readyToMark: [],
    readyToShip: [],
    loading: false,
    batchHint: ''
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
    const role = app.getRole()
    const user = app.getUser()
    const isWorker = role === 'supplier_worker'
    const canMarkProduced = app.hasPermission('mark_produced')
    const canCreateShipment = app.hasAnyPermission(['create_shipment'])
    const moduleAccess = app.getSupplierModuleAccess()

    this.setData({ loading: true, user, isWorker, canMarkProduced, canCreateShipment, moduleAccess })

    try {
      const [contractResult, inspectionResult] = await Promise.all([
        moduleAccess.contract
          ? callApi('contract.list', { page: 1, pageSize: 100 })
          : Promise.resolve({ list: [] }),
        callApi('inspection.list', { status: 'all' })
      ])

      const contracts = contractResult.list || []
      const pendingConfirmContracts = contracts.filter((contract) => contract.supplier_confirm_status === 'PENDING_CONFIRM')
      const batchResults = await Promise.all(
        contracts.map(contract => callApi('batch.list', { contractId: contract._id }).catch(() => ({ list: [] })))
      )

      const myContracts = contracts.map((contract, index) => {
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
          partName: contract.product_name || '采购合同',
          totalAmount: contract.total_amount ? formatNumber(contract.total_amount) : '',
          deliveredQty: formatNumber(deliveredQty),
          totalQty: formatNumber(totalQty),
          progress: calcProgress(deliveredQty, totalQty),
          statusText: getContractStatusLabel(contract.status),
          statusClass: getContractStatusClass(contract.status)
        }
      })

      const readyToMark = batchResults.flatMap(result => {
        return (result.list || []).flatMap(batch => {
          return (batch.parts || [])
            .filter(part => part.status === 'PENDING_PRODUCTION')
            .map(part => ({
              id: part.part_id,
              partName: part.part_name,
              batchNo: `第 ${batch.batch_no} 批`,
              planDate: batch.planned_date,
              planQty: formatNumber(part.planned_qty),
              rawPlanQty: Number(part.planned_qty || 0)
            }))
        })
      })

      const readyToShip = (inspectionResult.list || [])
        .filter(item => item.currentStatus === 'PENDING_SHIPMENT')
        .map(item => ({
          id: item.batchPartId,
          partName: item.partName,
          batchNo: `第 ${item.batchNo} 批`,
          contractNo: item.contractNo,
          totalQty: formatNumber(item.actualQty || item.plannedQty),
          rawQty: Number(item.actualQty || item.plannedQty || 0)
        }))

      const qcItems = (inspectionResult.list || []).slice(0, 6).map(item => ({
        id: item.batchPartId,
        partName: item.partName,
        batchNo: `第 ${item.batchNo} 批`,
        totalQty: formatNumber(item.actualQty || item.plannedQty),
        statusLabel: getInspectionStatusLabel(item.displayStatus, item.latestInspection?.result),
        badgeClass: getInspectionStatusClass(item.displayStatus, item.latestInspection?.result),
        status: item.displayStatus,
        passedQty: item.latestInspection?.qualified_qty || 0,
        defectQty: item.latestInspection?.defect_qty || 0
      }))

      const pendingDelivery = readyToShip.length
      const pendingQC = (inspectionResult.list || []).filter(item => item.currentStatus === 'PENDING_INSPECTION').length
      const batchHint = myContracts.length > 0 && readyToMark.length === 0 && readyToShip.length === 0 && pendingQC === 0
        ? '当前暂无可执行批次。请确认 PC 端合同已填写交付日期与数量，并在上传已签合同后自动生成交付批次。'
        : ''
      const todoItems = buildTodoItems({
        moduleAccess,
        readyCount: readyToMark.length,
        readyShipCount: readyToShip.length,
        qcCount: pendingQC,
        pendingConfirmContracts
      })

      this.setData({
        stats: {
          activeContracts: myContracts.length,
          pendingDelivery,
          pendingQC
        },
        moduleCards: buildModuleCards({
          moduleAccess,
          activeContracts: myContracts.length,
          readyToMarkCount: readyToMark.length,
          pendingQC,
          readyToShipCount: readyToShip.length
        }),
        todoItems,
        myContracts,
        recentContracts: myContracts.slice(0, 3),
        qcItems,
        readyToMark,
        readyToShip,
        batchHint
      })
    } catch (error) {
      showToast(error.message || '加载供应商首页失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  onMarkProduced(e) {
    if (!this.data.canMarkProduced) {
      showToast('当前账号没有标记已生产权限')
      return
    }
    const { id, qty } = e.currentTarget.dataset
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
          showToast('已标记为待验货', 'success')
          this.loadData()
        } catch (error) {
          showToast(error.message || '操作失败')
        }
      }
    })
  },

  onCreateShipment(e) {
    if (!this.data.canCreateShipment) {
      showToast('当前账号没有创建发货单权限')
      return
    }
    const { id } = e.currentTarget.dataset
    const suffix = id ? `?batchPartId=${id}` : ''
    wx.navigateTo({ url: `/pages/shipping/create/index${suffix}` })
  },

  onOpenModule(e) {
    const { key } = e.currentTarget.dataset
    if (!key) return

    if (key === 'contract') {
      wx.switchTab({ url: '/pages/contract/list/index' })
      return
    }

    if (key === 'production') {
      wx.navigateTo({ url: '/pages/quality/list/index' })
      return
    }

    if (key === 'shipping') {
      wx.navigateTo({ url: '/pages/shipping/list/index' })
      return
    }

    if (key === 'org') {
      wx.navigateTo({ url: '/pages/org/manage/index' })
    }
  },

  onTodoTap(e) {
    const { target, targetId } = e.currentTarget.dataset
    if (!target) {
      return
    }

    if (target === 'contract_detail' && targetId) {
      wx.navigateTo({
        url: `/pages/contract/detail/index?id=${targetId}`,
        fail: () => {
          wx.switchTab({ url: '/pages/contract/list/index' })
        }
      })
      return
    }

    if (target === 'contract_pending_confirm_list') {
      const app = getApp()
      app.globalData.contractListDefaultTab = 'pending_confirm'
      wx.switchTab({
        url: '/pages/contract/list/index',
        fail: () => {
          wx.reLaunch({ url: '/pages/contract/list/index' })
        }
      })
      return
    }

    if (target === 'quality_list') {
      wx.navigateTo({ url: '/pages/quality/list/index' })
      return
    }

    if (target === 'shipping_list') {
      wx.navigateTo({ url: '/pages/shipping/list/index' })
    }
  },

  goToContracts() { wx.switchTab({ url: '/pages/contract/list/index' }) },
  goToShipments() { wx.navigateTo({ url: '/pages/shipping/list/index' }) },
  goToQuality() { wx.navigateTo({ url: '/pages/quality/list/index' }) },
  goToQCDetail(e) { wx.navigateTo({ url: `/pages/quality/detail/index?id=${e.currentTarget.dataset.id}` }) },
  goToContractDetail(e) { wx.navigateTo({ url: `/pages/contract/detail/index?id=${e.currentTarget.dataset.id}` }) }
})

function buildTodoItems({ moduleAccess, readyCount, readyShipCount, qcCount, pendingConfirmContracts }) {
  const list = []
  const pendingContractConfirmCount = pendingConfirmContracts.length

  if (moduleAccess.contract && pendingContractConfirmCount > 0) {
    list.push({
      id: 'todo_contract_confirm',
      icon: '📄',
      title: `有 ${pendingContractConfirmCount} 份合同待确认`,
      content: '请先在线查阅合同内容，再确认无误。',
      time: '刚刚',
      target: pendingContractConfirmCount === 1 ? 'contract_detail' : 'contract_pending_confirm_list',
      targetId: pendingContractConfirmCount === 1 ? pendingConfirmContracts[0]._id : ''
    })
  }

  if (moduleAccess.production && readyCount > 0) {
    list.push({
      id: 'todo_production',
      icon: '🏭',
      title: `有 ${readyCount} 个配件待标记已生产`,
      content: '标记后系统会推送给甲方安排验货。',
      time: '刚刚',
      target: ''
    })
  }

  if (moduleAccess.shipping && readyShipCount > 0) {
    list.push({
      id: 'todo_shipping',
      icon: '🚚',
      title: `有 ${readyShipCount} 个配件待发货`,
      content: '验货通过后应尽快创建发货单并安排司机扫码提货。',
      time: '刚刚',
      target: 'shipping_list'
    })
  }

  if (moduleAccess.production && qcCount > 0) {
    list.push({
      id: 'todo_qc',
      icon: '🔍',
      title: `有 ${qcCount} 个配件处于待验货阶段`,
      content: '验货通过后即可进入待发货状态。',
      time: '刚刚',
      target: 'quality_list'
    })
  }

  if (list.length === 0) {
    list.push({
      id: 'todo_idle',
      icon: '✅',
      title: '当前没有待处理任务',
      content: '合同、生产和验货状态都已同步。',
      time: '刚刚',
      target: ''
    })
  }

  return list
}

function buildModuleCards({ moduleAccess, activeContracts, readyToMarkCount, pendingQC, readyToShipCount }) {
  const cards = []

  if (moduleAccess.contract) {
    cards.push({
      key: 'contract',
      icon: '📑',
      title: '合同与交付',
      description: '查看合同、批次与执行进度',
      stat: `${activeContracts} 份执行中`
    })
  }

  if (moduleAccess.production) {
    cards.push({
      key: 'production',
      icon: '🏭',
      title: '生产与验货',
      description: '待生产、待验货、验货结果',
      stat: `${readyToMarkCount + pendingQC} 项待处理`
    })
  }

  if (moduleAccess.shipping) {
    cards.push({
      key: 'shipping',
      icon: '🚚',
      title: '发货与物流',
      description: '待发货、运单、在途跟踪',
      stat: `${readyToShipCount} 项待发货`
    })
  }

  if (moduleAccess.org) {
    cards.push({
      key: 'org',
      icon: '👥',
      title: '我的组织',
      description: '成员与权限管理',
      stat: '维护组织联系人'
    })
  }

  return cards
}

function getContractTotalQty(contract) {
  const productItems = Array.isArray(contract.product_items) ? contract.product_items : []
  if (productItems.length > 0) {
    return productItems.reduce((sum, item) => sum + Number(item.total_qty || 0), 0)
  }

  return (contract.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}
