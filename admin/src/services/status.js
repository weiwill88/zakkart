import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function markBatchPartProduced(batchPartId, data = {}) {
  return callApi('status.markProduced', { batchPartId, ...data }, { token: getToken() })
}
