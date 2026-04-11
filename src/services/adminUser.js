import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchAdminUserList() {
  return callApi('adminUser.list', {}, { token: getToken() })
}

export async function createAdminUser(data) {
  return callApi('adminUser.create', data, { token: getToken() })
}

export async function updateAdminUserPermissions(data) {
  return callApi('adminUser.updatePermissions', data, { token: getToken() })
}

export async function deleteAdminUser(userId) {
  return callApi('adminUser.delete', { userId }, { token: getToken() })
}
