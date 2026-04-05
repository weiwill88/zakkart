import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchProductList(params = {}) {
  return callApi('product.list', params, { token: getToken() })
}

export async function fetchProductDetail(id) {
  return callApi('product.detail', { id }, { token: getToken() })
}

export async function fetchProductPartTypes(ids = []) {
  return callApi('product.partTypes', { ids }, { token: getToken() })
}

export async function createProduct(data) {
  return callApi('product.create', data, { token: getToken() })
}

export async function updateProduct(id, data) {
  return callApi('product.update', { id, ...data }, { token: getToken() })
}

export async function fetchProductStats() {
  return callApi('product.stats', {}, { token: getToken() })
}

export async function addSku(productId, sku) {
  return callApi('product.addSku', { productId, sku }, { token: getToken() })
}

export async function updateSku(productId, skuId, data) {
  return callApi('product.updateSku', { productId, skuId, ...data }, { token: getToken() })
}

export async function updateBom(productId, skuId, bom_items) {
  return callApi('product.updateBom', { productId, skuId, bom_items }, { token: getToken() })
}
