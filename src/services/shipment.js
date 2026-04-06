import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchShipmentList(params = {}) {
  return callApi('shipment.list', params, { token: getToken() })
}

export async function fetchShipmentDetail(id) {
  return callApi('shipment.detail', { id }, { token: getToken() })
}

export async function confirmShipmentQty(id, decision = 'CONFIRM') {
  return callApi('shipment.confirmQty', { id, decision }, { token: getToken() })
}

export async function fetchShipmentQrCode(id) {
  return callApi('shipment.qrcode', { id }, { token: getToken() })
}

export async function confirmShipmentArrival(id, items = [], photos = []) {
  return callApi('shipment.confirmArrival', { id, items, photos }, { token: getToken() })
}
