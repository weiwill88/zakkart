import { ensureAnonymousAccess, callCloudFunction } from './cloudbase'

export async function callApi(action, params = {}, options = {}) {
  const { skipAuth = false, token = '', anonymousOptional = true } = options

  if (anonymousOptional) {
    await ensureAnonymousAccess()
  }

  const payload = {
    action,
    params
  }

  if (!skipAuth && token) {
    payload.token = token
  }

  const response = await callCloudFunction('api', payload)
  const result = response?.result || {}

  if (result.code !== 0) {
    const error = new Error(result.message || '请求失败')
    error.code = result.code || 500
    error.details = result.data
    throw error
  }

  return result.data
}
