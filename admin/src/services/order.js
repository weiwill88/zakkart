import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function generateOrder(data) {
  return callApi('order.generate', data, { token: getToken() })
}
