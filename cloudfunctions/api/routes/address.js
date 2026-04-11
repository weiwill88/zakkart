const { getCollection, command, createKeywordRegExp } = require('../config/database')

const COLLECTION = 'addresses'

async function list({ params }) {
  const { page = 1, pageSize = 50, type, orgId, keyword } = params
  const col = getCollection(COLLECTION)
  const _ = command

  const conditions = []

  if (type) {
    conditions.push({ type })
  }
  if (orgId) {
    conditions.push({ org_id: orgId })
  }
  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { label: keywordRegExp },
      { detail: keywordRegExp },
      { contact_name: keywordRegExp }
    ]))
  }

  const whereClause = conditions.length > 0
    ? col.where(_.and(conditions))
    : col

  const countResult = await whereClause.count()
  const total = countResult.total

  const skip = (page - 1) * pageSize
  const listResult = await whereClause
    .orderBy('created_at', 'desc')
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

async function create({ params }) {
  const now = new Date().toISOString()
  const {
    org_id, org_name, type, label, province, city, district,
    detail, contact_name, contact_phone, is_default
  } = params

  if (!type || !label || !detail) {
    const error = new Error('缺少必填字段：type, label, detail')
    error.code = 400
    throw error
  }

  const doc = {
    org_id: org_id || null,
    org_name: org_name || null,
    type,
    label,
    province: province || '',
    city: city || '',
    district: district || '',
    detail,
    contact_name: contact_name || '',
    contact_phone: contact_phone || '',
    is_default: is_default || false,
    created_at: now,
    updated_at: now
  }

  const result = await getCollection(COLLECTION).add({ data: doc })
  return { _id: result._id, ...doc }
}

async function update({ params }) {
  const { id, _id, created_at, ...updates } = params
  if (!id) {
    const error = new Error('缺少地址 ID')
    error.code = 400
    throw error
  }

  updates.updated_at = new Date().toISOString()

  await getCollection(COLLECTION).doc(id).update({ data: updates })

  const result = await getCollection(COLLECTION).doc(id).get()
  return result.data
}

async function remove({ params }) {
  const { id } = params
  if (!id) {
    const error = new Error('缺少地址 ID')
    error.code = 400
    throw error
  }

  await getCollection(COLLECTION).doc(id).remove()
  return { deleted: true }
}

async function shippingOptions({ params, auth }) {
  const _ = command
  const { destinationType, excludeOrgId } = params || {}
  const types = destinationType ? [destinationType] : ['assembly', 'freight']
  const result = await getCollection(COLLECTION)
    .where({
      type: _.in(types)
    })
    .get()

  let list = result.data || []
  if (excludeOrgId) {
    list = list.filter(item => item.org_id !== excludeOrgId)
  }

  return { list }
}

module.exports = {
  'address.list': list,
  'address.create': create,
  'address.update': update,
  'address.delete': remove,
  'address.shippingOptions': shippingOptions
}
