import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchContractList(params = {}) {
  return callApi('contract.list', params, { token: getToken() })
}

export async function createContract(data) {
  return callApi('contract.create', data, { token: getToken() })
}

export async function fetchContractDetail(id) {
  return callApi('contract.detail', { id }, { token: getToken() })
}

export async function updateContract(id, data) {
  return callApi('contract.update', { id, ...data }, { token: getToken() })
}

export async function exportContractWord(id, wordFileId) {
  const params = { id }
  if (wordFileId) params.wordFileId = wordFileId
  return callApi('contract.exportWord', params, { token: getToken() })
}

export async function uploadSignedContract(id, signedPdfFileId) {
  return callApi('contract.uploadSigned', { id, signedPdfFileId }, { token: getToken() })
}

export async function confirmContract(id) {
  return callApi('contract.confirm', { id }, { token: getToken() })
}
