const { callApi } = require('../../../utils/api')

Page({
  data: { notifications: [] },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    try {
      const result = await callApi('notification.list', { page: 1, pageSize: 100 })
      const notifications = (result.list || []).map((item) => ({
        id: item._id,
        targetType: item.target_type || item.reference_type || '',
        targetId: item.target_id || item.reference_id || '',
        type: item.type || '',
        title: item.title || '系统通知',
        content: item.content || '',
        time: formatDate(item.created_at),
        read: Boolean(item.is_read || item.read)
      }))
      this.setData({ notifications })
    } catch (error) {
      wx.showToast({ title: error.message || '加载通知失败', icon: 'none' })
    }
  },

  async onNotificationTap(e) {
    const { item } = e.currentTarget.dataset
    if (!item) return

    if (!item.read) {
      try {
        await callApi('notification.read', { id: item.id })
        this.setData({
          notifications: this.data.notifications.map((notification) => (
            notification.id === item.id
              ? { ...notification, read: true }
              : notification
          ))
        })
      } catch (error) {
        wx.showToast({ title: error.message || '标记已读失败', icon: 'none' })
      }
    }

    if (item.targetType === 'contract' && item.targetId) {
      wx.navigateTo({ url: `/pages/contract/detail/index?id=${item.targetId}` })
      return
    }

    if ((item.targetType === 'inspection' || item.targetType === 'part') && item.targetId) {
      wx.navigateTo({ url: `/pages/quality/detail/index?id=${item.targetId}` })
      return
    }

    if (item.targetType === 'shipment' && item.targetId) {
      wx.navigateTo({ url: `/pages/shipping/detail/index?id=${item.targetId}` })
      return
    }

    if (item.targetType === 'freight_document') {
      wx.navigateTo({ url: '/pages/shipping/list/index?tab=all' })
    }
  }
})

function formatDate(value) {
  if (!value) return '刚刚'
  return String(value).slice(0, 16).replace('T', ' ')
}
