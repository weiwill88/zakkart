const { getCollection } = require('../config/database')
const { isAdminRole, isSupplierRole } = require('./access')

const BATCHES_COLLECTION = 'delivery_batches'

async function getVisibleBatches(auth) {
  if (isSupplierRole(auth?.role) && auth.org_id) {
    return getAllDocumentsFromQuery(
      getCollection(BATCHES_COLLECTION).where({ supplier_org_id: auth.org_id })
    )
  }

  if (isAdminRole(auth?.role)) {
    return getAllDocumentsFromQuery(getCollection(BATCHES_COLLECTION))
  }

  return []
}

async function findBatchPartById(batchPartId, auth) {
  const batches = await getVisibleBatches(auth)

  for (const batch of batches) {
    const partIndex = (batch.parts || []).findIndex(item => item.part_id === batchPartId)
    if (partIndex >= 0) {
      return {
        batch,
        part: batch.parts[partIndex],
        partIndex
      }
    }
  }

  return null
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
  getVisibleBatches,
  findBatchPartById,
  getAllDocumentsFromQuery
}
