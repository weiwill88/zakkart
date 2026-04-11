import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchAddressList(params = {}) {
  return callApi('address.list', params, { token: getToken() })
}

export async function createAddress(data) {
  return callApi('address.create', data, { token: getToken() })
}

export async function updateAddress(id, data) {
  return callApi('address.update', { id, ...data }, { token: getToken() })
}

export async function deleteAddress(id) {
  return callApi('address.delete', { id }, { token: getToken() })
}
