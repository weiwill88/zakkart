const { showToast } = require('../../../utils/util')
const { callApi } = require('../../../utils/api')
const { openDocumentUrl } = require('../../../utils/cloud')
const { getShipmentStatusLabel, getShipmentStatusClass } = require('../../../utils/status')

Page({
  data: {
    ship: {},
    canConfirmArrival: false,
    canCopyDriverLink: false
  },

  onLoad(options) {
    this.shipmentId = options.id
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const user = app.getUser() || {}
    const orgId = user.org?.id || ''

    try {
      const result = await callApi('shipment.detail', { id: this.shipmentId })
      this.setData({
        ship: {
          id: result._id,
          shipmentNo: result.shipment_no,
          shipperName: result.shipper_name,
          fromAddressLabel: result.from_address_label,
          toAddressLabel: result.to_address_label,
          status: result.status,
          statusLabel: getShipmentStatusLabel(result.status),
          badgeClass: getShipmentStatusClass(result.status),
          h5Url: result.h5_url || '',
          needConfirm: Boolean(result.need_confirm && !result.confirmed_at),
          confirmedAt: result.confirmed_at || '',
          driver: normalizeDriver(result.driver),
          freightDocument: result.freightDocument || null,
          items: (result.items || []).map(item => ({
            id: item.item_id,
            name: item.item_name,
            plannedQty: Number(item.planned_qty || 0),
            actualQty: Number(item.actual_qty || 0),
            actualReceivedQty: item.actual_received_qty != null ? Number(item.actual_received_qty || 0) : null,
            qtyModifyReason: item.qty_modify_reason || '',
            exceptionNote: item.exception_note || ''
          }))
        },
        canConfirmArrival: result.status === 'IN_TRANSIT' && result.to_org_id === orgId,
        canCopyDriverLink: result.shipper_org_id === orgId
      })
    } catch (error) {
      showToast(error.message || '加载发货单详情失败')
    }
  },

  onGoConfirmArrival() {
    wx.navigateTo({ url: `/pages/shipping/confirm/index?id=${this.shipmentId}` })
  },

  onCopyDriverLink() {
    if (!this.data.ship.h5Url) {
      showToast('暂无司机扫码链接')
      return
    }
    wx.setClipboardData({
      data: this.data.ship.h5Url,
      success: () => showToast('司机扫码链接已复制', 'success')
    })
  },

  onPreviewDriverImage(e) {
    const { current } = e.currentTarget.dataset
    const urls = [this.data.ship.driver?.signatureTempUrl, this.data.ship.driver?.loadingPhotoTempUrl].filter(Boolean)
    if (!current || urls.length === 0) {
      showToast('暂无可预览图片')
      return
    }
    wx.previewImage({ current, urls })
  },

  async onViewFreightDoc() {
    const fileId = this.data.ship.freightDocument?.file_id
    if (!fileId) {
      showToast('暂无货代单据')
      return
    }

    try {
      const result = await wx.cloud.getTempFileURL({ fileList: [fileId] })
      const tempUrl = result.fileList && result.fileList[0] && result.fileList[0].tempFileURL
      if (!tempUrl) {
        throw new Error('获取单据链接失败')
      }
      await openDocumentUrl(tempUrl)
    } catch (error) {
      showToast(error.message || '打开货代单据失败')
    }
  }
})

function normalizeDriver(driver = {}) {
  return {
    driver_name: driver.driver_name || '',
    plate_number: driver.plate_number || '',
    driver_phone: driver.driver_phone || '',
    step1_at: driver.step1_at || '',
    step2_at: driver.step2_at || '',
    step1GpsText: driver.step1_gps_text || '',
    step2GpsText: driver.step2_gps_text || '',
    signatureFileId: driver.signature_file_id || '',
    loadingPhotoFileId: driver.loading_photo_file_id || '',
    signatureTempUrl: driver.signature_temp_url || '',
    loadingPhotoTempUrl: driver.loading_photo_temp_url || ''
  }
}
