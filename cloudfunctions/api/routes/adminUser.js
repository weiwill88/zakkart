const { getCollection, command } = require('../config/database')
const { ensureAdminPermission } = require('../utils/access')

const USERS_COLLECTION = 'users'
const MANAGE_PERMISSION_KEY = 'module_admin_user'
const ADMIN_USER_ROLES = ['super_admin', 'admin', 'merchandiser']
const ADMIN_MODULE_KEYS = [
  'module_dashboard',
  'module_product',
  'module_part_type',
  'module_supplier',
  'module_order',
  'module_contract',
  'module_quality',
  'module_inventory',
  'module_shipment',
  'module_freight',
  'module_notification',
  'module_admin_user'
]
const ROLE_NAME_MAP = {
  super_admin: '超级管理员',
  admin: '甲方管理员',
  merchandiser: '甲方跟单员'
}

async function list({ auth }) {
  await ensureAdminPermission(auth, MANAGE_PERMISSION_KEY)

  const users = (await getAllAdminUsers())
    .sort((a, b) => `${b.created_at || ''}`.localeCompare(`${a.created_at || ''}`))

  return {
    list: users
  }
}

async function create({ params = {}, auth }) {
  await ensureAdminPermission(auth, MANAGE_PERMISSION_KEY)

  const { name, phone, role, role_name, permissions } = params
  if (!name || !phone || !role) {
    const error = new Error('缺少必填字段：name、phone、role')
    error.code = 400
    throw error
  }

  if (!/^1\d{10}$/.test(String(phone).trim())) {
    const error = new Error('手机号格式不正确')
    error.code = 400
    throw error
  }

  if (!ADMIN_USER_ROLES.includes(role)) {
    const error = new Error('甲方账号角色不正确')
    error.code = 400
    throw error
  }

  const existing = await getCollection(USERS_COLLECTION).where({ phone: String(phone).trim() }).count()
  if (existing.total > 0) {
    const error = new Error('该手机号已注册')
    error.code = 409
    throw error
  }

  const now = new Date().toISOString()
  const doc = {
    org_id: null,
    org_name: 'Zakkart',
    phone: String(phone).trim(),
    name: String(name).trim(),
    role,
    role_name: role_name || ROLE_NAME_MAP[role] || '甲方成员',
    wechat_openid: '',
    last_login_at: null,
    status: 'active',
    permissions: normalizeAdminPermissions(permissions, role),
    created_at: now,
    updated_at: now
  }

  const result = await getCollection(USERS_COLLECTION).add({ data: doc })
  return { _id: result._id, ...doc }
}

async function updatePermissions({ params = {}, auth }) {
  await ensureAdminPermission(auth, MANAGE_PERMISSION_KEY)

  const { userId, permissions, role, role_name } = params
  if (!userId || !Array.isArray(permissions)) {
    const error = new Error('缺少必填字段：userId、permissions')
    error.code = 400
    throw error
  }

  const result = await getCollection(USERS_COLLECTION).doc(userId).get()
  const user = result.data
  if (!user || !ADMIN_USER_ROLES.includes(user.role)) {
    const error = new Error('甲方成员不存在')
    error.code = 404
    throw error
  }

  if (user._id === auth.user_id && role && role !== user.role) {
    const error = new Error('不能修改自己的角色')
    error.code = 400
    throw error
  }

  const nextRole = role || user.role
  if (
    user._id === auth.user_id &&
    nextRole !== 'super_admin' &&
    !normalizeAdminPermissions(permissions, nextRole).some((item) => item.permission_key === MANAGE_PERMISSION_KEY && item.granted)
  ) {
    const error = new Error('不能移除自己对甲方权限管理模块的访问权限')
    error.code = 400
    throw error
  }

  const updateData = {
    role: nextRole,
    role_name: role_name || user.role_name || ROLE_NAME_MAP[nextRole] || '甲方成员',
    permissions: normalizeAdminPermissions(permissions, nextRole),
    updated_at: new Date().toISOString()
  }

  await getCollection(USERS_COLLECTION).doc(userId).update({ data: updateData })
  const updated = await getCollection(USERS_COLLECTION).doc(userId).get()
  return updated.data
}

async function remove({ params = {}, auth }) {
  await ensureAdminPermission(auth, MANAGE_PERMISSION_KEY)

  const { userId } = params
  if (!userId) {
    const error = new Error('缺少 userId')
    error.code = 400
    throw error
  }

  if (userId === auth.user_id) {
    const error = new Error('不能删除当前登录账号')
    error.code = 400
    throw error
  }

  const result = await getCollection(USERS_COLLECTION).doc(userId).get()
  const user = result.data
  if (!user || !ADMIN_USER_ROLES.includes(user.role)) {
    const error = new Error('甲方成员不存在')
    error.code = 404
    throw error
  }

  await getCollection(USERS_COLLECTION).doc(userId).remove()
  return { deleted: true }
}

function normalizeAdminPermissions(inputPermissions = [], role) {
  if (role === 'super_admin') {
    return [{ permission_key: '*', granted: true }]
  }

  const grantedKeys = new Set(
    (Array.isArray(inputPermissions) ? inputPermissions : [])
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

  return ADMIN_MODULE_KEYS.map((key) => ({
    permission_key: key,
    granted: grantedKeys.has(key)
  }))
}

async function getAllAdminUsers() {
  const list = []
  let offset = 0
  const pageSize = 100

  while (true) {
    const result = await getCollection(USERS_COLLECTION)
      .where({
        role: command.in(ADMIN_USER_ROLES)
      })
      .skip(offset)
      .limit(pageSize)
      .get()

    list.push(...(result.data || []))
    if ((result.data || []).length < pageSize) {
      break
    }
    offset += pageSize
  }

  return list
}

module.exports = {
  'adminUser.list': list,
  'adminUser.create': create,
  'adminUser.updatePermissions': updatePermissions,
  'adminUser.delete': remove
}
