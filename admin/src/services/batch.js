import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchBatchList(contractId) {
  return callApi('batch.list', { contractId }, { token: getToken() })
}

export async function createBatch(data) {
  return callApi('batch.create', data, { token: getToken() })
}

export async function updateBatch(id, data) {
  return callApi('batch.update', { id, ...data }, { token: getToken() })
}

export async function deleteBatch(id) {
  return callApi('batch.delete', { id }, { token: getToken() })
}
