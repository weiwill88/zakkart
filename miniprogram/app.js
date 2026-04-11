/**
 * Zakkart 供应链管理系统 - 全局 App
 */
const { ENV_ID } = require('./utils/config')

const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'
const PERMISSION_ALIAS_MAP = {
  view_contract_detail: ['view_contract_detail', 'contract_view', 'confirm_order'],
  view_contract_amount: ['view_contract_amount', 'contract_amount'],
  mark_produced: ['mark_produced'],
  create_shipment: ['create_shipment', 'shipping_create'],
  view_shipment: ['view_shipment', 'shipping_photo', 'shipment_confirm'],
  confirm_receiving: ['confirm_receiving', 'receive_confirm'],
  manage_members: ['manage_members']
}

App({
  globalData: {
    currentRole: '',
    currentUser: null,
    authToken: '',
    systemInfo: null,
    contractListDefaultTab: ''
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: ENV_ID,
        traceUser: true
      })
    }

    // 获取系统信息
    const systemInfo = wx.getWindowInfo()
    this.globalData.systemInfo = systemInfo

    // 仅恢复正式登录态，不再回退到原型角色模式
    const savedToken = wx.getStorageSync(TOKEN_KEY)
    const savedUser = wx.getStorageSync(USER_KEY)

    if (savedToken && savedUser) {
      const normalizedUser = normalizeAppUser(savedUser)
      this.globalData.authToken = savedToken
      this.globalData.currentUser = normalizedUser
      this.globalData.currentRole = mapRoleFromUser(normalizedUser)
      return
    }
  },

  setSession({ token, user }) {
    const normalizedUser = normalizeAppUser(user)
    this.globalData.authToken = token
    this.globalData.currentUser = normalizedUser
    this.globalData.currentRole = mapRoleFromUser(normalizedUser)

    wx.setStorageSync(TOKEN_KEY, token)
    wx.setStorageSync(USER_KEY, normalizedUser)
  },

  clearSession() {
    this.globalData.authToken = ''
    this.globalData.currentRole = ''
    this.globalData.currentUser = null
    wx.removeStorageSync(TOKEN_KEY)
    wx.removeStorageSync(USER_KEY)
    wx.removeStorageSync('currentRole')
  },

  /**
   * 获取当前角色
   */
  getRole() {
    return this.globalData.currentRole || ''
  },

  /**
   * 获取当前用户信息
   */
  getUser() {
    return this.globalData.currentUser
  },

  getToken() {
    return this.globalData.authToken
  },

  isLoggedIn() {
    return Boolean(this.globalData.authToken)
  },

  hasPermission(permissionKey) {
    const user = this.globalData.currentUser
    if (!user || !permissionKey) {
      return false
    }

    if (['super_admin', 'admin', 'merchandiser'].includes(user.role)) {
      return true
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : []
    if (permissions.some(item => item === 'all')) {
      return true
    }

    const candidateKeys = expandPermissionKeys([permissionKey])
    return permissions.some((item) => {
      if (typeof item === 'string') {
        return candidateKeys.includes(item)
      }
      return item && candidateKeys.includes(item.permission_key) && item.granted !== false
    })
  },

  hasAnyPermission(permissionKeys = []) {
    return (permissionKeys || []).some(key => this.hasPermission(key))
  },

  getSupplierModuleAccess() {
    const role = this.getRole()
    const isSupplierOwner = role === 'supplier'
    const isSupplierMember = role === 'supplier_worker'

    if (!isSupplierOwner && !isSupplierMember) {
      return {
        home: true,
        contract: false,
        production: false,
        shipping: false,
        org: false,
        settings: true
      }
    }

    return {
      home: true,
      contract: isSupplierOwner || this.hasAnyPermission(['view_contract_detail']),
      production: isSupplierOwner || this.hasAnyPermission(['mark_produced']),
      shipping: isSupplierOwner || this.hasAnyPermission(['create_shipment', 'view_shipment', 'confirm_receiving']),
      org: isSupplierOwner || this.hasPermission('manage_members'),
      settings: true
    }
  }
})

function expandPermissionKeys(permissionKeys = []) {
  return Array.from(new Set(
    (permissionKeys || []).flatMap((key) => PERMISSION_ALIAS_MAP[key] || [key])
  ))
}

function mapRoleFromUser(user) {
  if (!user || !user.role) {
    return 'admin'
  }

  if (user.role === 'super_admin' || user.role === 'admin') {
    return 'admin'
  }

  if (user.role === 'supplier_owner') {
    return 'supplier'
  }

  if (user.role === 'supplier_member') {
    return 'supplier_worker'
  }

  return user.role
}

function normalizeAppUser(user) {
  if (!user) {
    return null
  }

  const mappedRole = mapRoleFromUser(user)
  const roleNameMap = {
    admin: '甲方管理员',
    supplier: '供应商负责人',
    supplier_worker: '供应商成员',
    logistics: '物流方',
    warehouse: '组装厂'
  }

  return {
    ...user,
    roleName: user.roleName || user.role_name || roleNameMap[mappedRole] || '用户',
    org: user.org || {
      id: user.org_id || '',
      name: user.org_name || '未绑定组织',
      type: mappedRole === 'admin' ? 'company' : 'supplier'
    }
  }
}
