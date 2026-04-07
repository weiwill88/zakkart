import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchNotificationList(params = {}) {
  return callApi('notification.list', params, { token: getToken() })
}

export async function markNotificationRead(id) {
  return callApi('notification.read', { id }, { token: getToken() })
}

export async function markAllNotificationsRead() {
  return callApi('notification.readAll', {}, { token: getToken() })
}
