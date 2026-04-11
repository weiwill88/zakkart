const { callApi } = require('../../../utils/api')
const { calcProgress, formatNumber, showToast } = require('../../../utils/util')
const { openDocumentUrl } = require('../../../utils/cloud')
const { getContractStatusLabel, getContractStatusClass, getSupplierConfirmStatusLabel, getSupplierConfirmStatusClass, getPartStatusLabel, getPartStatusClass } = require('../../../utils/status')

Page({
  data: {
    contract: {},
    isSupplier: false,
    isAdmin: false,
    isSupplierWorker: false,
    canMarkProduced: false,
    canCreateShipment: false
  },

  onLoad(options) {
    this.contractId = options.id
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const role = app.getRole()
    const canMarkProduced = app.hasPermission('mark_produced')
    const canCreateShipment = app.hasAnyPermission(['create_shipment'])

    try {
      const [contract, batchResult] = await Promise.all([
        callApi('contract.detail', { id: this.contractId }),
        callApi('batch.list', { contractId: this.contractId })
      ])

      const batches = batchResult.list || []
      const totalQty = (contract.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      const deliveredQty = batches.reduce((sum, batch) => {
        return sum + (batch.parts || []).reduce((partSum, part) => {
          if (['PENDING_SHIPMENT', 'VEHICLE_DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(part.status)) {
            return partSum + Number(part.actual_qty || part.planned_qty || 0)
          }
          return partSum
        }, 0)
      }, 0)

      this.setData({
        contract: {
          id: contract._id,
          contractNo: contract.contract_no,
          productName: contract.product_name || '采购合同',
          supplierName: contract.supplier_name || '',
          signDate: formatDate(contract.signed_at || contract.created_at),
          totalQtyStr: formatNumber(totalQty),
          deliveredQtyStr: formatNumber(deliveredQty),
          progress: calcProgress(deliveredQty, totalQty),
          statusText: getContractStatusLabel(contract.status),
          statusClass: getContractStatusClass(contract.status),
          supplierConfirmStatus: contract.supplier_confirm_status || 'UNSENT',
          supplierConfirmText: getSupplierConfirmStatusLabel(contract.supplier_confirm_status),
          supplierConfirmClass: getSupplierConfirmStatusClass(contract.supplier_confirm_status),
          supplierConfirmedAt: formatDateTime(contract.supplier_confirmed_at),
          canConfirm: contract.status === 'PENDING_SIGN' && contract.supplier_confirm_status !== 'CONFIRMED',
          signedPdfFileId: contract.signed_pdf_file_id || '',
          document: buildContractDocument(contract),
          batches: batches.map(batch => ({
            id: batch._id,
            batchNo: `第 ${batch.batch_no} 批`,
            planDate: batch.planned_date,
            parts: (batch.parts || []).map(part => ({
              id: part.part_id,
              name: part.part_name,
              planQty: formatNumber(part.planned_qty),
              actualQty: formatNumber(part.actual_qty || 0),
              rawPlanQty: Number(part.planned_qty || 0),
              status: part.status,
              statusLabel: getPartStatusLabel(part.status),
              badgeClass: getPartStatusClass(part.status)
            }))
          }))
        },
        isSupplier: role === 'supplier',
        isAdmin: role === 'admin',
        isSupplierWorker: role === 'supplier_worker',
        canMarkProduced,
        canCreateShipment
      })

      wx.setNavigationBarTitle({ title: contract.contract_no || '合同详情' })
    } catch (error) {
      showToast(error.message || '加载合同详情失败')
    }
  },

  onMarkProduced(e) {
    if (!this.data.canMarkProduced) {
      showToast('当前账号没有标记已生产权限')
      return
    }
    const { partId, qty } = e.currentTarget.dataset
    wx.showModal({
      title: '确认标记',
      content: '标记后将进入待验货状态，等待甲方提交验货结果。',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await callApi('status.markProduced', {
            batchPartId: partId,
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
    const partId = e.currentTarget.dataset.partId || ''
    const suffix = partId ? `?batchPartId=${partId}` : ''
    wx.navigateTo({ url: `/pages/shipping/create/index${suffix}` })
  },

  async onConfirmContract() {
    try {
      await callApi('contract.confirm', { id: this.contractId })
      showToast('已确认合同内容', 'success')
      this.loadData()
    } catch (error) {
      showToast(error.message || '确认失败')
    }
  },

  async onViewSignedPdf() {
    if (!this.data.contract.signedPdfFileId) {
      showToast('暂无已签 PDF')
      return
    }

    try {
      const result = await callApi('contract.getSignedPdfUrl', { id: this.contractId })
      await openDocumentUrl(result.tempUrl)
    } catch (error) {
      showToast(error.message || '打开 PDF 失败')
    }
  }
})

function formatDate(value) {
  if (!value) return '--'
  return String(value).slice(0, 10).replace(/-/g, '/')
}

function formatDateTime(value) {
  if (!value) return '--'
  return String(value).slice(0, 16).replace('T', ' ')
}

function buildContractDocument(contract) {
  const buyerInfo = contract.buyer_info || {}
  const productItems = (contract.product_items || []).map((item) => {
    const qty = Number(item.total_qty || 0)
    const hasPrice = item.unit_price !== '' && item.unit_price !== null && item.unit_price !== undefined
    const price = Number(item.unit_price || 0)
    return {
      rowId: item.row_id,
      model: item.model || item.part_name || '',
      size: item.size || '以产前样品为准',
      material: item.material || '-',
      weight: item.weight || '-',
      color: item.color || '-',
      qtyDetail: formatQtyText(item),
      unitPrice: hasPrice ? `${Number(item.unit_price).toFixed(2)} 元/件` : '-',
      amount: hasPrice ? `${(qty * price).toLocaleString()} 元` : '-',
      rawAmount: hasPrice ? qty * price : 0
    }
  })
  const deliveryRows = (contract.delivery_rows || []).map((row) => {
    const quantities = productItems.map(item => Number(row.qtys?.[item.rowId] || 0))
    const rowTotal = quantities.reduce((sum, value) => sum + value, 0)
    return {
      date: row.date || '--',
      quantities,
      rowTotal
    }
  })
  const deliveryTotals = productItems.map(item => deliveryRows.reduce((sum, row) => sum + Number(row.quantities?.[productItems.findIndex(product => product.rowId === item.rowId)] || 0), 0))

  return {
    buyerInfo,
    supplierName: contract.supplier_name || '',
    supplierLegalPerson: contract.supplier_legal_person || '',
    supplierCreditCode: contract.supplier_credit_code || '',
    supplierAddress: contract.supplier_address || '',
    supplierPhone: contract.supplier_phone || '',
    productDesc: contract.product_desc || '',
    preamble: contract.clause_sections?.preamble || '',
    qualityClause: contract.clause_sections?.quality_clause || '',
    rawMaterials: contract.raw_materials || '',
    variationClause: contract.clause_sections?.variation_clause || '',
    deliveryClause: contract.clause_sections?.delivery_clause || '',
    qualityGuaranteeClause: contract.clause_sections?.quality_guarantee_clause || '',
    paymentClauseLines: splitLines(contract.clause_sections?.payment_clause),
    invoiceClauseLines: splitLines(contract.clause_sections?.invoice_clause),
    section6Lines: splitLines(contract.clause_sections?.section6_text),
    section7Lines: splitLines(contract.clause_sections?.section7_text),
    section8Lines: splitLines(contract.clause_sections?.section8_text),
    section9Lines: splitLines(contract.clause_sections?.section9_text),
    settlementItems: productItems.map(item => ({
      rowId: item.rowId,
      model: item.model || '-',
      qtyDetail: item.qtyDetail,
      unitPrice: item.unitPrice,
      amount: item.amount
    })),
    specItems: productItems.map(item => ({
      rowId: item.rowId,
      model: item.model || '-',
      size: item.size,
      material: item.material,
      weight: item.weight,
      color: item.color
    })),
    grandTotal: `${productItems.reduce((sum, item) => sum + Number(item.rawAmount || 0), 0).toLocaleString()} 元`,
    deliveryHeaders: productItems.map(item => item.model || '配件'),
    deliveryRows,
    deliveryTotals,
    deliveryGrandTotal: deliveryRows.reduce((sum, row) => sum + row.rowTotal, 0)
  }
}

function splitLines(text) {
  return String(text || '').split('\n').filter(Boolean)
}

function formatQtyText(item) {
  const detail = String(item.qty_detail || '').trim()
  const totalQty = Number(item.total_qty || 0).toLocaleString()
  return detail ? `${detail}\n合计：${totalQty}` : `合计：${totalQty}`
}
