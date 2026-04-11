import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchPartTypeList(params = {}) {
  return callApi('partType.list', params, { token: getToken() })
}

export async function createPartType(data) {
  return callApi('partType.create', data, { token: getToken() })
}

export async function updatePartType(id, data) {
  return callApi('partType.update', { id, ...data }, { token: getToken() })
}

export async function bulkUpdatePartTypes(list) {
  return callApi('partType.bulkUpdate', { list }, { token: getToken() })
}

export async function deletePartType(id) {
  return callApi('partType.delete', { id }, { token: getToken() })
}
