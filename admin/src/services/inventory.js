import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchInventoryOverview(params = {}) {
  return callApi('inventory.list', params, { token: getToken() })
}

export async function upsertInventoryItem(data) {
  return callApi('inventory.upsert', data, { token: getToken() })
}
