import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchInspectionList(params = {}) {
  return callApi('inspection.list', params, { token: getToken() })
}

export async function createInspection(data) {
  return callApi('inspection.create', data, { token: getToken() })
}
