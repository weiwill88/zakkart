import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { callApi } from '../services/api'
import { ADMIN_PERMISSION_KEYS, normalizeGrantedAdminPermissions } from '../constants/adminPermissions'

const TOKEN_KEY = 'zakkart.token'
const USER_KEY = 'zakkart.user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(parseStoredUser())
  const bootstrapped = ref(false)

  const isLoggedIn = computed(() => Boolean(token.value && user.value))
  const displayName = computed(() => user.value?.name || '未登录')
  const roleLabel = computed(() => user.value?.role_name || '访客')
  const isAdminLike = computed(() => ['super_admin', 'admin', 'merchandiser'].includes(user.value?.role))

  async function bootstrap() {
    if (bootstrapped.value) {
      return
    }

    if (!token.value || !user.value) {
      clearSession()
      bootstrapped.value = true
      return
    }

    try {
      const response = await callApi('auth.me', {}, { token: token.value })
      user.value = response.user
      persist()
    } catch (error) {
      clearSession()
    } finally {
      bootstrapped.value = true
    }
  }

  async function sendSmsCode(mobile) {
    return callApi('auth.smsSend', { mobile }, { skipAuth: true })
  }

  async function loginBySms(payload) {
    const response = await callApi('auth.smsLogin', payload, { skipAuth: true })
    token.value = response.token
    user.value = response.user
    persist()
    bootstrapped.value = true
    return response
  }

  function logout() {
    clearSession()
    bootstrapped.value = true
  }

  function clearSession() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function persist() {
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(user.value))
  }

  function hasAdminPermission(permissionKey) {
    if (!permissionKey) {
      return false
    }

    if (user.value?.role === 'super_admin') {
      return true
    }

    if (!isAdminLike.value) {
      return false
    }

    const permissions = Array.isArray(user.value?.permissions) ? user.value.permissions : []
    const grantedKeys = normalizeGrantedAdminPermissions(permissions)
    const hasConfiguredAdminModules = permissions.some((item) => {
      const permissionKeyValue = typeof item === 'string' ? item : item?.permission_key
      return ADMIN_PERMISSION_KEYS.includes(permissionKeyValue)
    })
    if (!hasConfiguredAdminModules) {
      return true
    }

    return grantedKeys.has(permissionKey)
  }

  return {
    token,
    user,
    bootstrapped,
    isLoggedIn,
    displayName,
    roleLabel,
    isAdminLike,
    bootstrap,
    sendSmsCode,
    loginBySms,
    logout,
    hasAdminPermission
  }
})

function parseStoredUser() {
  const raw = localStorage.getItem(USER_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    localStorage.removeItem(USER_KEY)
    return null
  }
}
