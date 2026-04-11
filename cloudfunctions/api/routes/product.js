const { getCollection, command, createKeywordRegExp } = require('../config/database')

const COLLECTION = 'products'
const PART_TYPES_COLLECTION = 'part_types'

async function list({ params }) {
  const { page = 1, pageSize = 20, keyword, type, category } = params
  const col = getCollection(COLLECTION)
  const _ = command

  const conditions = []

  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { name_cn: keywordRegExp },
      { code: keywordRegExp },
      { parent_asin: keywordRegExp }
    ]))
  }
  if (type) {
    conditions.push({ type })
  }
  if (category) {
    conditions.push({ category })
  }

  const whereClause = conditions.length > 0
    ? col.where(_.and(conditions))
    : col

  const countResult = await whereClause.count()
  const total = countResult.total

  const skip = (page - 1) * pageSize
  const listResult = await whereClause
    .orderBy('code', 'asc')
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
    const error = new Error('缺少产品 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  if (!result.data) {
    const error = new Error('产品不存在')
    error.code = 404
    throw error
  }

  return result.data
}

async function create({ params, auth }) {
  const now = new Date().toISOString()
  const { code, name_cn, name_en, parent_asin, type, category, alert_days, skus } = params

  if (!code || !name_cn || !type) {
    const error = new Error('缺少必填字段：code, name_cn, type')
    error.code = 400
    throw error
  }

  const existing = await getCollection(COLLECTION).where({ code }).count()
  if (existing.total > 0) {
    const error = new Error(`产品编号 ${code} 已存在`)
    error.code = 409
    throw error
  }

  const normalizedSkus = Array.isArray(skus) ? skus : []
  validateSkus(normalizedSkus)

  const doc = {
    code,
    name_cn,
    name_en: name_en || '',
    parent_asin: parent_asin || '',
    type,
    category: category || '',
    alert_days: alert_days || 15,
    skus: normalizedSkus,
    created_at: now,
    updated_at: now
  }

  const result = await getCollection(COLLECTION).add({ data: doc })

  return { _id: result._id, ...doc }
}

async function update({ params }) {
  const { id, _id, created_at, ...updates } = params
  if (!id) {
    const error = new Error('缺少产品 ID')
    error.code = 400
    throw error
  }

  if (updates.code) {
    const existing = await getCollection(COLLECTION).where({ code: updates.code }).get()
    const duplicate = (existing.data || []).find(item => item._id !== id)
    if (duplicate) {
      const error = new Error(`产品编号 ${updates.code} 已存在`)
      error.code = 409
      throw error
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'skus')) {
    validateSkus(Array.isArray(updates.skus) ? updates.skus : [])
  }

  updates.updated_at = new Date().toISOString()

  await getCollection(COLLECTION).doc(id).update({ data: updates })

  const result = await getCollection(COLLECTION).doc(id).get()
  return result.data
}

async function stats() {
  const products = await getAllDocuments(COLLECTION)

  const totalListings = products.length
  let totalSkus = 0
  let assembled = 0
  let simple = 0
  let accessories = 0
  const allParts = new Set()

  products.forEach(p => {
    totalSkus += (p.skus || []).length
    if (p.type === 'assembly') assembled++
    else if (p.type === 'simple') simple++
    else if (p.type === 'accessory') accessories++

    ;(p.skus || []).forEach(s => {
      ;(s.bom_items || []).forEach(b => allParts.add(b.part_name))
    })
  })

  return {
    totalListings,
    totalSkus,
    assembled,
    simple,
    accessories,
    totalParts: allParts.size
  }
}

async function partTypes({ params }) {
  const ids = Array.from(new Set(params.ids || [])).filter(Boolean)
  if (ids.length === 0) {
    return { list: [] }
  }

  const _ = command
  const list = []

  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100)
    const result = await getCollection(PART_TYPES_COLLECTION)
      .where({
        _id: _.in(chunk)
      })
      .get()
    list.push(...result.data)
  }

  return { list }
}

async function partTypeCatalog({ params }) {
  const { keyword, category } = params || {}
  const col = getCollection(PART_TYPES_COLLECTION)
  const _ = command
  const conditions = []

  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { name: keywordRegExp },
      { category: keywordRegExp },
      { supplier_org_name: keywordRegExp }
    ]))
  }

  if (category) {
    conditions.push({ category })
  }

  const whereClause = conditions.length > 0
    ? col.where(_.and(conditions))
    : col

  const list = await getAllDocumentsFromQuery(whereClause)
  list.sort((a, b) => `${a.category}-${a.name}`.localeCompare(`${b.category}-${b.name}`, 'zh-CN'))
  return { list }
}

async function getAllDocuments(collectionName, pageSize = 100) {
  const collection = getCollection(collectionName)
  const documents = []
  let offset = 0

  while (true) {
    const result = await collection
      .skip(offset)
      .limit(pageSize)
      .get()

    documents.push(...result.data)

    if (result.data.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return documents
}

async function addSku({ params }) {
  const { productId, sku } = params
  if (!productId || !sku || !sku.sku_id || !sku.spec) {
    const error = new Error('缺少必填字段')
    error.code = 400
    throw error
  }

  validateSkus([sku])

  const existingProduct = await getCollection(COLLECTION).doc(productId).get()
  if (!existingProduct.data) {
    const error = new Error('产品不存在')
    error.code = 404
    throw error
  }

  if ((existingProduct.data.skus || []).some(item => item.sku_id === sku.sku_id)) {
    const error = new Error(`SKU ID ${sku.sku_id} 已存在`)
    error.code = 409
    throw error
  }

  const _ = command
  const now = new Date().toISOString()

  await getCollection(COLLECTION).doc(productId).update({
    data: {
      skus: _.push(sku),
      updated_at: now
    }
  })

  const result = await getCollection(COLLECTION).doc(productId).get()
  return result.data
}

async function updateSku({ params }) {
  const { productId, skuId, ...updates } = params
  if (!productId || !skuId) {
    const error = new Error('缺少 productId 或 skuId')
    error.code = 400
    throw error
  }

  const productResult = await getCollection(COLLECTION).doc(productId).get()
  const product = productResult.data
  if (!product) {
    const error = new Error('产品不存在')
    error.code = 404
    throw error
  }

  const skuIndex = (product.skus || []).findIndex(s => s.sku_id === skuId)
  if (skuIndex === -1) {
    const error = new Error('SKU 不存在')
    error.code = 404
    throw error
  }

  const updatedSku = { ...product.skus[skuIndex], ...updates }
  validateSkus([updatedSku])
  product.skus[skuIndex] = updatedSku

  await getCollection(COLLECTION).doc(productId).update({
    data: {
      skus: product.skus,
      updated_at: new Date().toISOString()
    }
  })

  return updatedSku
}

async function updateBom({ params }) {
  const { productId, skuId, bom_items } = params
  if (!productId || !skuId || !Array.isArray(bom_items)) {
    const error = new Error('缺少必填字段')
    error.code = 400
    throw error
  }

  const productResult = await getCollection(COLLECTION).doc(productId).get()
  const product = productResult.data
  if (!product) {
    const error = new Error('产品不存在')
    error.code = 404
    throw error
  }

  const skuIndex = (product.skus || []).findIndex(s => s.sku_id === skuId)
  if (skuIndex === -1) {
    const error = new Error('SKU 不存在')
    error.code = 404
    throw error
  }

  validateBomItems(bom_items)
  product.skus[skuIndex].bom_items = bom_items

  await getCollection(COLLECTION).doc(productId).update({
    data: {
      skus: product.skus,
      updated_at: new Date().toISOString()
    }
  })

  return product.skus[skuIndex]
}

async function deleteProduct({ params }) {
  const { id } = params
  if (!id) {
    const error = new Error('缺少产品 ID')
    error.code = 400
    throw error
  }

  await getCollection(COLLECTION).doc(id).remove()
  return { success: true }
}

async function deleteSku({ params }) {
  const { productId, skuId } = params
  if (!productId || !skuId) {
    const error = new Error('缺少 productId 或 skuId')
    error.code = 400
    throw error
  }

  const productResult = await getCollection(COLLECTION).doc(productId).get()
  const product = productResult.data
  if (!product) {
    const error = new Error('产品不存在')
    error.code = 404
    throw error
  }

  const nextSkus = (product.skus || []).filter(item => item.sku_id !== skuId)
  if (nextSkus.length === (product.skus || []).length) {
    const error = new Error('SKU 不存在')
    error.code = 404
    throw error
  }

  await getCollection(COLLECTION).doc(productId).update({
    data: {
      skus: nextSkus,
      updated_at: new Date().toISOString()
    }
  })

  return { success: true, skus: nextSkus }
}

function validateSkus(skus) {
  const seen = new Set()
  skus.forEach((sku, index) => {
    if (!sku || !sku.sku_id || !sku.spec) {
      const error = new Error(`SKU 第 ${index + 1} 项缺少 sku_id 或 spec`)
      error.code = 400
      throw error
    }

    if (seen.has(sku.sku_id)) {
      const error = new Error(`SKU ID ${sku.sku_id} 重复`)
      error.code = 409
      throw error
    }

    seen.add(sku.sku_id)
    validateBomItems(sku.bom_items || [])
  })
}

function validateBomItems(bomItems) {
  bomItems.forEach((item, index) => {
    if (!item.part_type_id || !item.part_name) {
      const error = new Error(`BOM 第 ${index + 1} 项缺少 part_type_id 或 part_name`)
      error.code = 400
      throw error
    }

    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      const error = new Error(`BOM 第 ${index + 1} 项数量必须大于 0`)
      error.code = 400
      throw error
    }
  })
}

async function getAllDocumentsFromQuery(query, pageSize = 100) {
  const documents = []
  let offset = 0

  while (true) {
    const result = await query
      .skip(offset)
      .limit(pageSize)
      .get()

    documents.push(...result.data)

    if (result.data.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return documents
}

module.exports = {
  'product.list': list,
  'product.detail': detail,
  'product.create': create,
  'product.update': update,
  'product.delete': deleteProduct,
  'product.stats': stats,
  'product.partTypes': partTypes,
  'product.partTypeCatalog': partTypeCatalog,
  'product.addSku': addSku,
  'product.updateSku': updateSku,
  'product.deleteSku': deleteSku,
  'product.updateBom': updateBom
}
