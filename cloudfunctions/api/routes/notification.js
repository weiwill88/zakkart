const { getCollection } = require('../config/database')

const COLLECTION = 'notifications'

async function list({ params = {}, auth }) {
  const { page = 1, pageSize = 20 } = params
  const normalizedPage = Math.max(Number(page) || 1, 1)
  const normalizedPageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
  const skip = (normalizedPage - 1) * normalizedPageSize

  const [countResult, listResult, unreadResult] = await Promise.all([
    getCollection(COLLECTION)
      .where({ user_id: auth.user_id })
      .count(),
    getCollection(COLLECTION)
      .where({ user_id: auth.user_id })
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(normalizedPageSize)
      .get(),
    getCollection(COLLECTION)
      .where({
        user_id: auth.user_id,
        is_read: false
      })
      .count()
      .catch(() => ({ total: 0 }))
  ])

  return {
    list: (listResult.data || []).map(normalizeNotification),
    total: countResult.total || 0,
    unreadTotal: unreadResult.total || 0,
    page: normalizedPage,
    pageSize: normalizedPageSize
  }
}

async function markRead({ params = {}, auth }) {
  const { id } = params
  if (!id) {
    const error = new Error('缺少通知 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get().catch(() => ({ data: null }))
  const notification = result.data || null
  if (!notification) {
    const error = new Error('通知不存在')
    error.code = 404
    throw error
  }
  if (notification.user_id !== auth.user_id) {
    const error = new Error('无权操作该通知')
    error.code = 403
    throw error
  }

  const readAt = new Date().toISOString()
  await getCollection(COLLECTION).doc(id).update({
    data: {
      is_read: true,
      read: true,
      read_at: readAt
    }
  })

  return {
    id,
    read: true,
    readAt
  }
}

async function readAll({ auth }) {
  const readAt = new Date().toISOString()
  await getCollection(COLLECTION)
    .where({ user_id: auth.user_id })
    .update({
      data: {
        is_read: true,
        read: true,
        read_at: readAt
      }
    })
    .catch(() => null)

  return {
    success: true,
    readAt
  }
}

function normalizeNotification(item) {
  return {
    ...item,
    is_read: Boolean(item.is_read || item.read),
    read: Boolean(item.is_read || item.read),
    target_type: item.target_type || item.reference_type || '',
    target_id: item.target_id || item.reference_id || ''
  }
}

module.exports = {
  'notification.list': list,
  'notification.read': markRead,
  'notification.readAll': readAll
}
