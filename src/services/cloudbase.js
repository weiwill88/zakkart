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
  return app.callFunction({ name, data })
}

export async function uploadCloudFile({ cloudPath, file }) {
  const app = getCloudbaseApp()
  return app.uploadFile({
    cloudPath,
    filePath: file
  })
}

export async function getTempFileURLs(fileList) {
  const app = getCloudbaseApp()
  return app.getTempFileURL({ fileList })
}

async function ensureAnonymousAccessInternal() {
  const auth = getCloudbaseAuth()
  const loginState = await auth.getLoginState()

  if (loginState) {
    return loginState
  }

  try {
    await auth.anonymousAuthProvider().signIn()
    return auth.getLoginState()
  } catch (error) {
    console.warn('[cloudbase] anonymous sign-in failed, continue in guest mode during development', error)
    return null
  }
}
