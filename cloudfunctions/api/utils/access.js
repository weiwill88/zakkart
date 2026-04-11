const { getCollection } = require('../config/database')

const USERS_COLLECTION = 'users'
const SUPPLIER_PERMISSION_ALIAS_MAP = {
  view_contract_detail: ['view_contract_detail', 'contract_view'],
  view_contract_amount: ['view_contract_amount', 'contract_amount'],
  mark_produced: ['mark_produced'],
  create_shipment: ['create_shipment', 'shipping_create'],
  view_shipment: ['view_shipment', 'shipping_photo', 'shipment_confirm'],
  confirm_receiving: ['confirm_receiving', 'receive_confirm'],
  manage_members: ['manage_members']
}
const ADMIN_MODULE_PERMISSION_ALIAS_MAP = {
  module_dashboard: ['module_dashboard'],
  module_product: ['module_product'],
  module_part_type: ['module_part_type'],
  module_supplier: ['module_supplier'],
  module_order: ['module_order'],
  module_contract: ['module_contract'],
  module_quality: ['module_quality'],
  module_inventory: ['module_inventory'],
  module_shipment: ['module_shipment'],
  module_freight: ['module_freight'],
  module_notification: ['module_notification'],
  module_admin_user: ['module_admin_user']
}
const ADMIN_MODULE_PERMISSION_KEYS = Object.keys(ADMIN_MODULE_PERMISSION_ALIAS_MAP)

function isAdminRole(role) {
  return ['super_admin', 'admin', 'merchandiser'].includes(role)
}

function isSupplierRole(role) {
  return ['supplier_owner', 'supplier_member'].includes(role)
}

function ensureAdmin(auth, message = '无权限执行该操作') {
  if (!auth || !isAdminRole(auth.role)) {
    const error = new Error(message)
    error.code = 403
    throw error
  }
}

function ensureSupplierOrAdmin(auth, message = '无权限执行该操作') {
  if (!auth || (!isAdminRole(auth.role) && !isSupplierRole(auth.role))) {
    const error = new Error(message)
    error.code = 403
    throw error
  }
}

async function ensureSupplierPermission(auth, permissionKeys = [], message = '当前账号没有对应权限') {
  const hasPermission = await hasSupplierPermission(auth, permissionKeys)
  if (hasPermission) {
    return
  }

  const error = new Error(message)
  error.code = 403
  throw error
}

async function hasSupplierPermission(auth, permissionKeys = []) {
  if (!auth) {
    return false
  }

  if (isAdminRole(auth.role) || auth.role === 'supplier_owner') {
    return true
  }

  if (auth.role !== 'supplier_member') {
    return false
  }

  const userResult = await getCollection(USERS_COLLECTION).doc(auth.user_id).get().catch(() => ({ data: null }))
  const permissions = userResult.data?.permissions || []
  const grantedKeys = new Set(
    permissions
      .filter((item) => {
        if (!item) {
          return false
        }
        if (typeof item === 'string') {
          return true
        }
        return item.granted !== false
      })
      .map((item) => (typeof item === 'string' ? item : item.permission_key))
      .filter(Boolean)
  )

  const candidateKeys = expandPermissionKeys(permissionKeys)
  if (candidateKeys.some((key) => grantedKeys.has(key))) {
    return true
  }
  return false
}

async function ensureAdminPermission(auth, permissionKeys = [], message = '当前账号没有对应模块权限') {
  const hasPermission = await hasAdminPermission(auth, permissionKeys)
  if (hasPermission) {
    return
  }

  const error = new Error(message)
  error.code = 403
  throw error
}

async function hasAdminPermission(auth, permissionKeys = []) {
  if (!auth) {
    return false
  }

  if (auth.role === 'super_admin') {
    return true
  }

  if (!isAdminRole(auth.role)) {
    return false
  }

  const userResult = await getCollection(USERS_COLLECTION).doc(auth.user_id).get().catch(() => ({ data: null }))
  const permissions = userResult.data?.permissions || auth.permissions || []
  const grantedKeys = new Set(
    permissions
      .filter((item) => {
        if (!item) {
          return false
        }
        if (typeof item === 'string') {
          return true
        }
        return item.granted !== false
      })
      .map((item) => (typeof item === 'string' ? item : item.permission_key))
      .filter(Boolean)
  )

  const hasConfiguredAdminModules = permissions.some((item) => {
    const permissionKey = typeof item === 'string' ? item : item?.permission_key
    return ADMIN_MODULE_PERMISSION_KEYS.includes(permissionKey)
  })
  if (!hasConfiguredAdminModules) {
    return true
  }

  const candidateKeys = expandAdminPermissionKeys(permissionKeys)
  return candidateKeys.some((key) => grantedKeys.has(key))
}

function expandPermissionKeys(permissionKeys = []) {
  return Array.from(new Set(
    (Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys])
      .filter(Boolean)
      .flatMap((key) => SUPPLIER_PERMISSION_ALIAS_MAP[key] || [key])
  ))
}

function expandAdminPermissionKeys(permissionKeys = []) {
  return Array.from(new Set(
    (Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys])
      .filter(Boolean)
      .flatMap((key) => ADMIN_MODULE_PERMISSION_ALIAS_MAP[key] || [key])
  ))
}

function ensureOrgAccess(auth, orgId, message = '无权访问该组织数据') {
  if (!auth) {
    const error = new Error(message)
    error.code = 403
    throw error
  }

  if (isAdminRole(auth.role)) {
    return
  }

  if (!orgId || auth.org_id !== orgId) {
    const error = new Error(message)
    error.code = 403
    throw error
  }
}

module.exports = {
  isAdminRole,
  isSupplierRole,
  ensureAdmin,
  ensureAdminPermission,
  ensureSupplierOrAdmin,
  hasAdminPermission,
  hasSupplierPermission,
  ensureSupplierPermission,
  ensureOrgAccess,
  ADMIN_MODULE_PERMISSION_KEYS
}
