import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TCB_ENV_ID) || 'cloud1-0g855x4wc43be3c4'

let appInstance
let authInstance
let anonymousPromise

export function getCloudbaseApp() {
  if (!appInstance) {
    appInstance = cloudbase.init({
      env: ENV_ID
    })
  }

  return appInstance
}

export function getCloudbaseAuth() {
  if (!authInstance) {
    authInstance = getCloudbaseApp().auth({
      persistence: 'local'
    })
  }

  return authInstance
}

export async function ensureAnonymousAccess() {
  if (!anonymousPromise) {
    anonymousPromise = ensureAnonymousAccessInternal().finally(() => {
      anonymousPromise = null
    })
  }

  return anonymousPromise
}

export async function callCloudFunction(name, data) {
  const app = getCloudbaseApp()
  try {
    return await app.callFunction({ name, data })
  } catch (error) {
    throw normalizeCloudbaseError(error)
  }
}

export async function uploadCloudFile({ cloudPath, file }) {
  const app = getCloudbaseApp()
  try {
    return await app.uploadFile({
      cloudPath,
      filePath: file
    })
  } catch (error) {
    throw normalizeCloudbaseError(error)
  }
}

export async function getTempFileURLs(fileList) {
  const app = getCloudbaseApp()
  try {
    return await app.getTempFileURL({ fileList })
  } catch (error) {
    throw normalizeCloudbaseError(error)
  }
}

async function ensureAnonymousAccessInternal() {
  let auth
  try {
    auth = getCloudbaseAuth()
  } catch (error) {
    console.warn('[cloudbase] auth init failed, continue in guest mode during development', error)
    return null
  }

  const loginState = await safeGetLoginState(auth)

  if (loginState) {
    return loginState
  }

  try {
    if (typeof auth.signInAnonymously === 'function') {
      const result = await auth.signInAnonymously({})
      if (result?.error) {
        throw result.error
      }
      return result?.data?.session || result || null
    }

    const provider = auth?.anonymousAuthProvider?.()
    if (!provider || typeof provider.signIn !== 'function') {
      return null
    }

    await provider.signIn()
    return safeGetLoginState(auth)
  } catch (error) {
    const normalizedError = normalizeCloudbaseError(error)
    console.warn('[cloudbase] anonymous sign-in failed', normalizedError)
    throw normalizedError
  }
}

async function safeGetLoginState(auth) {
  if (!auth || typeof auth.getLoginState !== 'function') {
    return null
  }

  try {
    const loginState = await auth.getLoginState()
    return loginState || null
  } catch (error) {
    console.warn('[cloudbase] getLoginState failed, continue in guest mode during development', error)
    return null
  }
}

function normalizeCloudbaseError(error) {
  const rawMessage = String(
    error?.message
    || error?.error
    || error?.errMsg
    || error?.error_description
    || ''
  )
  const normalizedMessage = rawMessage.toLowerCase()

  if (
    normalizedMessage.includes('network request error')
    || normalizedMessage.includes('invalid_request_source')
    || normalizedMessage.includes('cors')
  ) {
    const domain = typeof window !== 'undefined' ? window.location.origin : '当前站点域名'
    const wrapped = new Error(
      `CloudBase 网络请求失败。请优先检查：1）CloudBase 控制台已开启匿名登录；2）已将 ${domain} 加入 Web 安全域名；3）若使用 Vercel 预览域名，请确认当前访问域名也已加入白名单。`
    )
    wrapped.cause = error
    wrapped.code = error?.code || 'NETWORK_REQUEST_ERROR'
    return wrapped
  }

  return error instanceof Error ? error : new Error(rawMessage || 'CloudBase 请求失败')
}
