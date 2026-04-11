// pages/shipping/confirm/index.js
const { callApi } = require('../../../utils/api')
const { showToast } = require('../../../utils/util')

Page({
  data: {
    shipment: null,
    items: [],
    photoList: [],
    submitting: false
  },

  onLoad(options) {
    this.shipmentId = options.id
    this.loadData()
  },

  async loadData() {
    try {
      const result = await callApi('shipment.detail', { id: this.shipmentId })
      this.setData({
        shipment: {
          shipmentNo: result.shipment_no,
          toAddressLabel: result.to_address_label
        },
        items: (result.items || []).map(item => ({
          itemId: item.item_id,
          itemName: item.item_name,
          plannedQty: Number(item.actual_qty || 0),
          actualReceivedQty: Number(item.actual_qty || 0),
          exceptionNote: ''
        }))
      })
    } catch (error) {
      showToast(error.message || '加载收货页失败')
    }
  },

  onQtyInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const items = [...this.data.items]
    items[index].actualReceivedQty = Number(e.detail.value || 0)
    this.setData({ items })
  },

  onNoteInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const items = [...this.data.items]
    items[index].exceptionNote = e.detail.value
    this.setData({ items })
  },

  onChoosePhoto() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      success: (res) => {
        this.setData({
          photoList: (res.tempFiles || []).map((file, index) => ({
            id: `${Date.now()}_${index}`,
            tempFilePath: file.tempFilePath
          }))
        })
      }
    })
  },

  async onSubmit() {
    this.setData({ submitting: true })
    try {
      const photos = []
      for (let index = 0; index < this.data.photoList.length; index += 1) {
        const file = this.data.photoList[index]
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `shipment-arrival/${this.shipmentId}/${Date.now()}_${index}.jpg`,
          filePath: file.tempFilePath
        })
        photos.push(uploadResult.fileID)
      }

      await callApi('shipment.confirmArrival', {
        id: this.shipmentId,
        items: this.data.items.map(item => ({
          itemId: item.itemId,
          actualReceivedQty: Number(item.actualReceivedQty || 0),
          hasException: Number(item.actualReceivedQty || 0) !== Number(item.plannedQty || 0) || Boolean(item.exceptionNote),
          exceptionNote: item.exceptionNote || ''
        })),
        photos
      })
      showToast('已确认收货', 'success')
      setTimeout(() => {
        wx.redirectTo({ url: `/pages/shipping/detail/index?id=${this.shipmentId}` })
      }, 1200)
    } catch (error) {
      showToast(error.message || '确认收货失败')
    } finally {
      this.setData({ submitting: false })
    }
  }
})
