const { getCollection, command } = require('../config/database')
const { ensureAdmin, ensureSupplierOrAdmin, hasSupplierPermission, isSupplierRole } = require('../utils/access')
const { safeCreateNotification, completeShipmentArrival } = require('../utils/shipment')
const { getAllDocumentsFromQuery } = require('../utils/batch-parts')

const COLLECTION = 'freight_documents'
const SHIPMENTS_COLLECTION = 'shipment_orders'

async function create({ params = {}, auth }) {
  ensureAdmin(auth, '无权限上传货代单据')

  const { fileId, fileName, freightAddressId, shipmentOrderIds = [] } = params
  if (!fileId || !freightAddressId) {
    const error = new Error('缺少单据文件或货代地址')
    error.code = 400
    throw error
  }

  const now = new Date().toISOString()
  const doc = {
    file_id: fileId,
    file_name: fileName || '',
    uploaded_by: auth.user_id || '',
    freight_address_id: freightAddressId,
    arrived_confirmed_by: null,
    arrived_confirmed_at: null,
    created_at: now
  }

  const addResult = await getCollection(COLLECTION).add({ data: doc })
  const shipmentIds = Array.isArray(shipmentOrderIds) ? shipmentOrderIds.filter(Boolean) : []
  const receiverOrgIds = new Set()
  for (const shipmentId of shipmentIds) {
    const shipmentResult = await getCollection(SHIPMENTS_COLLECTION).doc(shipmentId).get().catch(() => ({ data: null }))
    const shipment = shipmentResult.data || null
    await getCollection(SHIPMENTS_COLLECTION).doc(shipmentId).update({
      data: {
        freight_doc_id: addResult._id,
        updated_at: now
      }
    })
    ;[shipment?.shipper_org_id, shipment?.to_org_id].filter(Boolean).forEach((orgId) => receiverOrgIds.add(orgId))
  }

  await safeCreateNotification({
    type: 'freight_doc_uploaded',
    title: '货代入库指示单已上传',
    content: fileName || '新的货代单据已上传',
    receiverOrgIds: Array.from(receiverOrgIds),
    targetType: 'freight_document',
    targetId: addResult._id
  })

  return {
    _id: addResult._id,
    ...doc,
    shipment_order_ids: shipmentIds
  }
}

async function list({ auth }) {
  ensureSupplierOrAdmin(auth)

  let docs = await getAllDocumentsFromQuery(getCollection(COLLECTION).orderBy('created_at', 'desc'))
  if (isSupplierRole(auth?.role)) {
    const canViewOutbound = await hasSupplierPermission(auth, ['view_shipment', 'create_shipment'])
    const canConfirmReceiving = await hasSupplierPermission(auth, ['confirm_receiving'])
    if (!canViewOutbound && !canConfirmReceiving) {
      const error = new Error('当前账号没有查看货代单据的权限')
      error.code = 403
      throw error
    }

    const shipments = await getAllDocumentsFromQuery(
      getCollection(SHIPMENTS_COLLECTION).where(
        command.or([
          ...(canViewOutbound ? [{ shipper_org_id: auth.org_id }] : []),
          ...(canConfirmReceiving ? [{ to_org_id: auth.org_id }] : [])
        ])
      )
    )
    const visibleIds = new Set((shipments || []).map((item) => item.freight_doc_id).filter(Boolean))
    docs = docs.filter((item) => visibleIds.has(item._id))
  }

  const shipments = await getAllDocumentsFromQuery(getCollection(SHIPMENTS_COLLECTION))
  const shipmentMap = shipments.reduce((acc, item) => {
    if (item.freight_doc_id) {
      if (!acc[item.freight_doc_id]) {
        acc[item.freight_doc_id] = []
      }
      acc[item.freight_doc_id].push({
        _id: item._id,
        shipment_no: item.shipment_no,
        shipper_name: item.shipper_name,
        status: item.status,
        to_address_label: item.to_address_label
      })
    }
    return acc
  }, {})

  return {
    list: docs.map((item) => ({
      ...item,
      shipments: shipmentMap[item._id] || []
    }))
  }
}

async function confirmArrival({ params = {}, auth }) {
  ensureAdmin(auth, '无权限确认货代到达')

  const { id } = params
  if (!id) {
    const error = new Error('缺少货代单据 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(COLLECTION).doc(id).get()
  const doc = result.data
  if (!doc) {
    const error = new Error('货代单据不存在')
    error.code = 404
    throw error
  }

  const now = new Date().toISOString()
  const relatedShipments = await getAllDocumentsFromQuery(
    getCollection(SHIPMENTS_COLLECTION).where({ freight_doc_id: id })
  )
  const invalidShipments = relatedShipments.filter((item) => !['IN_TRANSIT', 'ARRIVED'].includes(item.status))
  if (invalidShipments.length > 0) {
    const error = new Error(`仍有发货单未处于在途状态：${invalidShipments.slice(0, 3).map((item) => item.shipment_no).join('、')}`)
    error.code = 409
    throw error
  }

  let arrivedShipmentCount = 0
  for (const shipment of relatedShipments) {
    if (shipment.status === 'ARRIVED') {
      continue
    }
    await completeShipmentArrival({
      shipment,
      authUserId: auth.user_id || '',
      items: (shipment.items || []).map((item) => ({
        itemId: item.item_id,
        actualReceivedQty: Number(item.actual_qty || 0),
        hasException: false,
        exceptionNote: ''
      })),
      photos: [],
      skipInventory: true
    })
    arrivedShipmentCount += 1
  }

  await getCollection(COLLECTION).doc(id).update({
    data: {
      arrived_confirmed_by: auth.user_id || '',
      arrived_confirmed_at: now
    }
  })

  await safeCreateNotification({
    type: 'freight_arrived',
    title: '货代到达已确认',
    content: `${doc.file_name || '货代单据'} 已确认到达`,
    receiverRole: 'admin',
    targetType: 'freight_document',
    targetId: id
  })

  return {
    freightDocumentId: id,
    arrivedConfirmedBy: auth.user_id || '',
    arrivedConfirmedAt: now,
    arrivedShipmentCount
  }
}

module.exports = {
  'freightDocument.create': create,
  'freightDocument.list': list,
  'freightDocument.confirmArrival': confirmArrival
}
