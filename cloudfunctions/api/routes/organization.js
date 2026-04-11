const { getCollection, command, createKeywordRegExp } = require('../config/database')
const { ensureAdmin } = require('../utils/access')

const COLLECTION = 'organizations'
const USERS_COLLECTION = 'users'
const PART_TYPES_COLLECTION = 'part_types'
const MEMBER_PERMISSION_KEYS = [
  'view_contract_detail',
  'view_contract_amount',
  'confirm_order',
  'mark_produced',
  'create_shipment',
  'view_shipment',
  'view_inventory',
  'confirm_receiving',
  'assembly_operation',
  'manage_members'
]

async function list({ params }) {
  const { page = 1, pageSize = 20, keyword, cooperation_status } = params
  const col = getCollection(COLLECTION)
  const _ = command

  const conditions = []

  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { name: keywordRegExp },
      { credit_code: keywordRegExp }
    ]))
  }
  if (cooperation_status) {
    conditions.push({ cooperation_status })
  }

  const whereClause = conditions.length > 0
    ? col.where(_.and(conditions))
    : col

  const countResult = await whereClause.count()
  const total = countResult.total

  const skip = (page - 1) * pageSize
  const listResult = await whereClause
    .orderBy('name', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    list: listResult.data,
    total,
    page,
    pageSize
  }
}

async function detail({ params }) {
  const { id } = params
  if (!id) {
    const error = new Error('缺少组织 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  if (!result.data) {
    const error = new Error('组织不存在')
    error.code = 404
    throw error
  }

  return result.data
}

async function create({ params }) {
  const now = new Date().toISOString()
  const { name, credit_code, legal_person, has_assembly, cooperation_note } = params

  if (!name) {
    const error = new Error('缺少必填字段：name')
    error.code = 400
    throw error
  }

  const doc = {
    name,
    credit_code: credit_code || '',
    legal_person: legal_person || '',
    has_assembly: has_assembly || false,
    cooperation_status: 'active',
    cooperation_note: cooperation_note || '',
    bank_info: {
      bank_name: '',
      bank_account: '',
      bank_branch: ''
    },
    contact_phone: '',
    address: '',
    raw_materials: [],
    created_at: now,
    updated_at: now
  }

  const result = await getCollection(COLLECTION).add({ data: doc })
  return { _id: result._id, ...doc }
}

async function update({ params }) {
  const { id, ...updates } = params
  if (!id) {
    const error = new Error('缺少组织 ID')
    error.code = 400
    throw error
  }

  updates.updated_at = new Date().toISOString()

  // If name changed, need to propagate to redundant fields
  const nameChanged = updates.name !== undefined
  let oldName = null
  if (nameChanged) {
    const oldDoc = await getCollection(COLLECTION).doc(id).get()
    oldName = oldDoc.data?.name
  }

  await getCollection(COLLECTION).doc(id).update({ data: updates })

  // Propagate name change to redundant fields in other collections
  if (nameChanged && oldName && updates.name !== oldName) {
    const newName = updates.name
    await propagateOrgNameChange(id, newName)
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  return result.data
}

async function rawMaterials({ params, auth }) {
  ensureAdmin(auth)
  const { orgId } = params || {}
  if (!orgId) {
    const error = new Error('缺少组织 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(orgId).get()
  if (!result.data) {
    const error = new Error('组织不存在')
    error.code = 404
    throw error
  }

  return { list: result.data.raw_materials || [] }
}

async function updateRawMaterials({ params, auth }) {
  ensureAdmin(auth)
  const { orgId, list } = params || {}
  if (!orgId) {
    const error = new Error('缺少组织 ID')
    error.code = 400
    throw error
  }

  if (!Array.isArray(list)) {
    const error = new Error('原材料数据格式错误')
    error.code = 400
    throw error
  }

  const normalizedList = list.map((item, index) => ({
    material_id: item.material_id || `rm_${Date.now()}_${index}`,
    name: String(item.name || '').trim(),
    note: String(item.note || '').trim(),
    sort_order: Number(item.sort_order || index + 1)
  })).filter(item => item.name)

  await getCollection(COLLECTION).doc(orgId).update({
    data: {
      raw_materials: normalizedList,
      updated_at: new Date().toISOString()
    }
  })

  return { list: normalizedList }
}

async function propagateOrgNameChange(orgId, newName) {
  const _ = command

  // Update users.org_name
  try {
    await getCollection(USERS_COLLECTION)
      .where({ org_id: orgId })
      .update({ data: { org_name: newName } })
  } catch (e) { /* ignore if no matching docs */ }

  // Update part_types.supplier_org_name
  try {
    await getCollection(PART_TYPES_COLLECTION)
      .where({ supplier_org_id: orgId })
      .update({ data: { supplier_org_name: newName } })
  } catch (e) { /* ignore */ }

  // Update addresses.org_name
  try {
    await getCollection('addresses')
      .where({ org_id: orgId })
      .update({ data: { org_name: newName } })
  } catch (e) { /* ignore */ }
}

async function memberList({ params, auth }) {
  const { orgId } = params
  if (!orgId) {
    const error = new Error('缺少组织 ID')
    error.code = 400
    throw error
  }
  await ensureMemberViewAccess(auth, orgId)

  const result = await getCollection(USERS_COLLECTION)
    .where({ org_id: orgId })
    .orderBy('created_at', 'desc')
    .get()

  return { list: result.data }
}

async function memberAdd({ params, auth }) {
  const { orgId, name, phone, role, permissions } = params
  if (!orgId || !name || !phone) {
    const error = new Error('缺少必填字段：orgId, name, phone')
    error.code = 400
    throw error
  }
  await ensureMemberManageAccess(auth, orgId)
  if (!isAdminRequest(auth) && role === 'supplier_owner') {
    const error = new Error('供应商侧不可新增负责人账号')
    error.code = 403
    throw error
  }

  // Check if phone already exists
  const existing = await getCollection(USERS_COLLECTION).where({ phone }).count()
  if (existing.total > 0) {
    const error = new Error('该手机号已注册')
    error.code = 409
    throw error
  }

  // Get org name for redundant field
  const orgResult = await getCollection(COLLECTION).doc(orgId).get()
  const orgName = orgResult.data?.name || ''

  const now = new Date().toISOString()
  const defaultPermissions = [
    ...MEMBER_PERMISSION_KEYS
  ]

  const userRole = role || 'supplier_member'
  const permList = normalizePermissions(permissions, defaultPermissions, userRole)

  const doc = {
    org_id: orgId,
    org_name: orgName,
    phone,
    name,
    role: userRole,
    wechat_openid: '',
    last_login_at: null,
    status: 'active',
    permissions: permList,
    created_at: now
  }

  const result = await getCollection(USERS_COLLECTION).add({ data: doc })
  return { _id: result._id, ...doc }
}

async function memberUpdatePermissions({ params, auth }) {
  const { memberId, permissions } = params
  if (!memberId || !Array.isArray(permissions)) {
    const error = new Error('缺少必填字段')
    error.code = 400
    throw error
  }
  const memberResult = await getCollection(USERS_COLLECTION).doc(memberId).get()
  const member = memberResult.data
  if (!member) {
    const error = new Error('成员不存在')
    error.code = 404
    throw error
  }
  await ensureMemberManageAccess(auth, member.org_id)
  if (!isAdminRequest(auth) && member.role === 'supplier_owner') {
    const error = new Error('负责人权限只能由甲方管理员调整')
    error.code = 403
    throw error
  }

  await getCollection(USERS_COLLECTION).doc(memberId).update({
    data: { permissions: normalizePermissions(permissions, MEMBER_PERMISSION_KEYS, member.role) }
  })

  const result = await getCollection(USERS_COLLECTION).doc(memberId).get()
  return result.data
}

async function memberDelete({ params, auth }) {
  const { memberId } = params
  if (!memberId) {
    const error = new Error('缺少成员 ID')
    error.code = 400
    throw error
  }
  const memberResult = await getCollection(USERS_COLLECTION).doc(memberId).get()
  const member = memberResult.data
  if (!member) {
    const error = new Error('成员不存在')
    error.code = 404
    throw error
  }
  await ensureMemberManageAccess(auth, member.org_id)
  if (!isAdminRequest(auth) && member.role === 'supplier_owner') {
    const error = new Error('供应商侧不可删除负责人账号')
    error.code = 403
    throw error
  }

  await getCollection(USERS_COLLECTION).doc(memberId).remove()
  return { deleted: true }
}

async function ensureMemberManageAccess(auth, orgId) {
  if (!auth) {
    const error = new Error('无权限执行该操作')
    error.code = 403
    throw error
  }

  if (isAdminRequest(auth)) {
    return
  }

  if (auth.org_id !== orgId) {
    const error = new Error('无权管理其他组织成员')
    error.code = 403
    throw error
  }

  if (auth.role === 'supplier_owner') {
    return
  }

  const currentUser = await getCollection(USERS_COLLECTION).doc(auth.user_id).get().catch(() => ({ data: null }))
  const permissions = currentUser.data?.permissions || []
  const hasManageMembers = permissions.some(item => item.permission_key === 'manage_members' && item.granted)
  if (!hasManageMembers) {
    const error = new Error('当前账号没有成员管理权限')
    error.code = 403
    throw error
  }
}

async function ensureMemberViewAccess(auth, orgId) {
  if (!auth) {
    const error = new Error('无权限执行该操作')
    error.code = 403
    throw error
  }

  if (isAdminRequest(auth)) {
    return
  }

  if (auth.org_id !== orgId) {
    const error = new Error('无权查看其他组织成员')
    error.code = 403
    throw error
  }
}

function normalizePermissions(inputPermissions, fallbackKeys, userRole) {
  if (userRole === 'supplier_owner') {
    return MEMBER_PERMISSION_KEYS.map(key => ({
      permission_key: key,
      granted: true
    }))
  }

  const inputList = Array.isArray(inputPermissions) ? inputPermissions : []
  if (inputList.length > 0 && typeof inputList[0] === 'object') {
    const grantedSet = new Set(
      inputList.filter(item => item && item.granted).map(item => item.permission_key)
    )
    return MEMBER_PERMISSION_KEYS.map(key => ({
      permission_key: key,
      granted: grantedSet.has(key)
    }))
  }

  const grantedSet = new Set((inputList.length > 0 ? inputList : fallbackKeys).filter(Boolean))
  return MEMBER_PERMISSION_KEYS.map(key => ({
    permission_key: key,
    granted: grantedSet.has(key)
  }))
}

function isAdminRequest(auth) {
  return ['super_admin', 'admin', 'merchandiser'].includes(auth?.role)
}

async function partPrices({ params }) {
  const { orgId } = params
  if (!orgId) {
    const error = new Error('缺少组织 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(PART_TYPES_COLLECTION)
    .where({ supplier_org_id: orgId })
    .get()

  return { list: result.data }
}

async function updatePartPrice({ params }) {
  const { partTypeId, unit_price, price_note } = params
  if (!partTypeId) {
    const error = new Error('缺少配件类型 ID')
    error.code = 400
    throw error
  }

  const updates = {}
  if (unit_price !== undefined) updates.unit_price = unit_price
  if (price_note !== undefined) updates.price_note = price_note

  await getCollection(PART_TYPES_COLLECTION).doc(partTypeId).update({ data: updates })

  const result = await getCollection(PART_TYPES_COLLECTION).doc(partTypeId).get()
  return result.data
}

module.exports = {
  'organization.list': list,
  'organization.detail': detail,
  'organization.create': create,
  'organization.update': update,
  'organization.rawMaterials': rawMaterials,
  'organization.updateRawMaterials': updateRawMaterials,
  'organization.memberList': memberList,
  'organization.memberAdd': memberAdd,
  'organization.memberUpdatePermissions': memberUpdatePermissions,
  'organization.memberDelete': memberDelete,
  'organization.partPrices': partPrices,
  'organization.updatePartPrice': updatePartPrice
}
