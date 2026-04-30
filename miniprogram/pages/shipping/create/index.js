const { showToast } = require('../../../utils/util')
const { callApi } = require('../../../utils/api')
const { normalizeAddressOptions, resolveDestinationType } = require('../../../utils/shipping-form')

Page({
  data: {
    candidates: [],
    orgDetail: null,
    fromAddresses: [],
    toAddresses: [],
    selectedFromIndex: 0,
    selectedToIndex: 0,
    submitting: false,
    destinationType: '',
    destinationRuleText: ''
  },

  onLoad(options) {
    this.prefillBatchPartId = options.batchPartId || ''
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const orgId = app.getUser()?.org?.id || ''

    try {
      const [inspectionResult, ownAddressResult, orgDetailResult, contractResult, productResult] = await Promise.all([
        callApi('inspection.list', { status: 'all' }),
        callApi('address.list', { page: 1, pageSize: 100, orgId }),
        callApi('organization.detail', { id: orgId }).catch(() => ({ _id: orgId, name: app.getUser()?.org?.name || '', has_assembly: false })),
        callApi('contract.list', { page: 1, pageSize: 200 }),
        callApi('product.list', { page: 1, pageSize: 200 })
      ])
      const orgDetail = orgDetailResult || {}

      const contractMap = (contractResult.list || []).reduce((acc, item) => {
        acc[item._id] = item
        return acc
      }, {})
      const productMap = (productResult.list || []).reduce((acc, item) => {
        acc[item._id] = item
        return acc
      }, {})

      const candidates = (inspectionResult.list || [])
        .filter(item => item.currentStatus === 'PENDING_SHIPMENT')
        .map(item => ({
          id: item.batchPartId,
          contractId: item.contractId,
          name: item.partName,
          batchNo: `第 ${item.batchNo} 批`,
          contractNo: item.contractNo,
          plannedQty: Number(item.actualQty || item.plannedQty || 0),
          actualQty: Number(item.actualQty || item.plannedQty || 0),
          qtyModifyReason: '',
          selected: this.prefillBatchPartId ? item.batchPartId === this.prefillBatchPartId : false,
          destinationType: resolveCandidateDestinationType(item, orgDetail, contractMap, productMap)
        }))

      const ownAddresses = normalizeAddressOptions((ownAddressResult.list || []).filter(item => ['factory', 'assembly'].includes(item.type)))
      const selectedFromIndex = resolveDefaultFromIndex(ownAddresses, orgDetail)
      const destinationType = resolveDestinationType(candidates, orgDetail)
      const shippingOptionResult = await callApi('address.shippingOptions', {
        destinationType,
        excludeOrgId: orgId
      })
      const toAddresses = normalizeAddressOptions(shippingOptionResult.list || [])

      this.setData({
        candidates,
        orgDetail,
        fromAddresses: ownAddresses,
        toAddresses,
        selectedFromIndex,
        selectedToIndex: 0,
        destinationType,
        destinationRuleText: buildDestinationRuleText(destinationType)
      })
    } catch (error) {
      showToast(error.message || '加载发货数据失败')
    }
  },

  async onToggleSelect(e) {
    const index = Number(e.currentTarget.dataset.index)
    const candidates = [...this.data.candidates]
    const nextSelected = !candidates[index].selected
    if (nextSelected) {
      const selectedItems = candidates.filter(item => item.selected)
      if (selectedItems.length > 0 && selectedItems[0].destinationType !== candidates[index].destinationType) {
        showToast('同一发货单只能选择同一目的地规则的货物')
        return
      }
    }
    candidates[index].selected = nextSelected
    await this.updateDestinationOptions(candidates)
  },

  onQtyInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = Number(e.detail.value || 0)
    const candidates = [...this.data.candidates]
    candidates[index].actualQty = value
    this.setData({ candidates })
  },

  onReasonInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const candidates = [...this.data.candidates]
    candidates[index].qtyModifyReason = e.detail.value
    this.setData({ candidates })
  },

  onFromChange(e) {
    this.setData({ selectedFromIndex: Number(e.detail.value || 0) })
  },

  onToChange(e) {
    this.setData({ selectedToIndex: Number(e.detail.value || 0) })
  },

  async updateDestinationOptions(candidates) {
    const app = getApp()
    const orgId = app.getUser()?.org?.id || ''
    const destinationType = resolveDestinationType(candidates, this.data.orgDetail)
    const shippingOptionResult = await callApi('address.shippingOptions', {
      destinationType,
      excludeOrgId: orgId
    })
    this.setData({
      candidates,
      destinationType,
      destinationRuleText: buildDestinationRuleText(destinationType),
      toAddresses: normalizeAddressOptions(shippingOptionResult.list || []),
      selectedToIndex: 0
    })
  },

  async onSubmit() {
    const selectedItems = this.data.candidates.filter(item => item.selected)
    if (selectedItems.length === 0) {
      showToast('请至少选择一条待发货明细')
      return
    }

    const fromAddress = this.data.fromAddresses[this.data.selectedFromIndex]
    const toAddress = this.data.toAddresses[this.data.selectedToIndex]
    if (!fromAddress || !toAddress) {
      showToast('请选择发货地址和目的地')
      return
    }

    for (const item of selectedItems) {
      if (!item.actualQty || item.actualQty <= 0) {
        showToast(`请填写 ${item.name} 的实际发货数量`)
        return
      }
      if (item.actualQty !== item.plannedQty && !String(item.qtyModifyReason || '').trim()) {
        showToast(`请填写 ${item.name} 的数量调整原因`)
        return
      }
    }

    this.setData({ submitting: true })
    try {
      const result = await callApi('shipment.create', {
        fromAddressId: fromAddress.id,
        toAddressId: toAddress.id,
        items: selectedItems.map(item => ({
          batchPartId: item.id,
          actualQty: Number(item.actualQty || 0),
          qtyModifyReason: item.qtyModifyReason || '',
          isFreeReplenish: false
        }))
      })

      wx.showModal({
        title: '发货单已创建',
        content: result.needConfirm
          ? '本单存在数量调整，需甲方确认后司机才能扫码接单。'
          : '发货单已生成，可在详情页查看司机扫码链接。',
        showCancel: false,
        success: () => {
          wx.redirectTo({ url: `/pages/shipping/detail/index?id=${result.shipmentId}` })
        }
      })
    } catch (error) {
      showToast(error.message || '创建发货单失败')
    } finally {
      this.setData({ submitting: false })
    }
  }
})

function resolveCandidateDestinationType(item, orgDetail, contractMap, productMap) {
  if (orgDetail && orgDetail.has_assembly) {
    return 'freight'
  }

  const contract = contractMap[item.contractId] || {}
  const product = productMap[contract.product_id] || {}
  if (product.type === 'simple' || product.type === 'accessory') {
    return 'freight'
  }

  return 'assembly'
}

function resolveDefaultFromIndex(addresses, orgDetail) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return 0
  }

  const defaultIndex = addresses.findIndex(item => item.is_default)
  if (defaultIndex >= 0) {
    return defaultIndex
  }

  const preferredType = orgDetail && orgDetail.has_assembly ? 'assembly' : 'factory'
  const preferredIndex = addresses.findIndex(item => item.type === preferredType)
  return preferredIndex >= 0 ? preferredIndex : 0
}

function buildDestinationRuleText(destinationType) {
  if (destinationType === 'freight') {
    return '当前所选货物只能发往货代地址'
  }
  return '当前所选货物只能发往组装厂地址'
}
