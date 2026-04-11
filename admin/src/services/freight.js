import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchFreightDocuments() {
  return callApi('freightDocument.list', {}, { token: getToken() })
}

export async function createFreightDocument(payload) {
  return callApi('freightDocument.create', payload, { token: getToken() })
}

export async function confirmFreightArrival(id) {
  return callApi('freightDocument.confirmArrival', { id }, { token: getToken() })
}
