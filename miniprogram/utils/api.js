const { API_FUNCTION_NAME } = require('./config')

async function callApi(action, params = {}, options = {}) {
  const { skipAuth = false, token = '' } = options
  const app = getApp()

  const payload = {
    action,
    params
  }

  const authToken = token || app.getToken()
  if (!skipAuth && authToken) {
    payload.token = authToken
  }

  const response = await wx.cloud.callFunction({
    name: API_FUNCTION_NAME,
    data: payload
  })

  const result = response.result || {}
  if (result.code !== 0) {
    const error = new Error(result.message || '请求失败')
    error.code = result.code || 500
    error.details = result.data
    throw error
  }

  return result.data
}

module.exports = {
  callApi
}
