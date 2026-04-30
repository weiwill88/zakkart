const { getCollection } = require('../config/database')
const { resolveShipmentTarget, updateTargetStatus, safeCreateNotification, buildShipmentSummary } = require('../utils/shipment')

const SHIPMENTS_COLLECTION = 'shipment_orders'

async function shipmentInfo({ params = {} }) {
  const shipment = await getShipmentByToken(params.token)
  return {
    shipment: buildShipmentSummary(shipment),
    canStep1: shipment.status === 'CREATED' && (!shipment.need_confirm || Boolean(shipment.confirmed_at)),
    canStep2: shipment.status === 'VEHICLE_DISPATCHED'
  }
}

async function driverStep1({ params = {} }) {
  const shipment = await getShipmentByToken(params.token)
  if (shipment.status !== 'CREATED') {
    const error = new Error('当前状态不允许司机接单')
    error.code = 409
    throw error
  }
  if (shipment.need_confirm && !shipment.confirmed_at) {
    const error = new Error('该发货单仍待甲方确认数量')
    error.code = 409
    throw error
  }

  const driverName = String(params.driverName || '').trim()
  const plateNumber = String(params.plateNumber || '').trim().toUpperCase()
  if (!driverName || !plateNumber) {
    const error = new Error('司机姓名和车牌号不能为空')
    error.code = 400
    throw error
  }

  await ensureDriverObject(shipment)

  const now = new Date().toISOString()
  const driver = {
    ...(shipment.driver || {}),
    driver_name: driverName,
    plate_number: plateNumber,
    driver_phone: String(params.driverPhone || '').trim(),
    step1_at: now,
    step1_gps_lat: params.gpsLat != null ? Number(params.gpsLat) : null,
    step1_gps_lng: params.gpsLng != null ? Number(params.gpsLng) : null
  }

  for (const item of shipment.items || []) {
    const target = await resolveShipmentTarget({
      batchPartId: item.batch_part_id,
      assemblyOrderId: item.assembly_order_id
    })
    if (target) {
      await updateTargetStatus(target, 'VEHICLE_DISPATCHED')
    }
  }

  await getCollection(SHIPMENTS_COLLECTION).doc(shipment._id).update({
    data: {
      driver,
      status: 'VEHICLE_DISPATCHED',
      updated_at: now
    }
  })

  await safeCreateNotification({
    type: 'driver_accepted',
    title: '司机已接单',
    content: `${shipment.shipment_no} 已登记司机 ${driverName} / ${plateNumber}`,
    receiverOrgIds: [shipment.shipper_org_id, shipment.to_org_id],
    targetType: 'shipment',
    targetId: shipment._id
  })

  return {
    shipmentId: shipment._id,
    status: 'VEHICLE_DISPATCHED',
    driver
  }
}

async function driverStep2({ params = {} }) {
  const shipment = await getShipmentByToken(params.token)
  if (shipment.status !== 'VEHICLE_DISPATCHED') {
    const error = new Error('当前状态不允许确认提货')
    error.code = 409
    throw error
  }

  const signatureFileId = String(params.signatureFileId || '').trim()
  const loadingPhotoFileId = String(params.loadingPhotoFileId || '').trim()
  if (!signatureFileId || !loadingPhotoFileId) {
    const error = new Error('缺少签名或装车照片')
    error.code = 400
    throw error
  }

  await ensureDriverObject(shipment)

  const now = new Date().toISOString()
  const driver = {
    ...(shipment.driver || {}),
    signature_file_id: signatureFileId,
    loading_photo_file_id: loadingPhotoFileId,
    step2_at: now,
    step2_gps_lat: params.gpsLat != null ? Number(params.gpsLat) : null,
    step2_gps_lng: params.gpsLng != null ? Number(params.gpsLng) : null
  }

  for (const item of shipment.items || []) {
    const target = await resolveShipmentTarget({
      batchPartId: item.batch_part_id,
      assemblyOrderId: item.assembly_order_id
    })
    if (target) {
      await updateTargetStatus(target, 'IN_TRANSIT')
    }
  }

  await getCollection(SHIPMENTS_COLLECTION).doc(shipment._id).update({
    data: {
      driver,
      status: 'IN_TRANSIT',
      updated_at: now
    }
  })

  await safeCreateNotification({
    type: 'shipment_in_transit',
    title: '货物已发出',
    content: `${shipment.shipment_no} 已完成提货，正在运输中`,
    receiverOrgId: shipment.to_org_id || '',
    targetType: 'shipment',
    targetId: shipment._id
  })

  return {
    shipmentId: shipment._id,
    status: 'IN_TRANSIT',
    driver
  }
}

async function getShipmentByToken(token) {
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) {
    const error = new Error('缺少发货单 token')
    error.code = 400
    throw error
  }

  const result = await getCollection(SHIPMENTS_COLLECTION)
    .where({ h5_token: normalizedToken })
    .limit(1)
    .get()

  const shipment = result.data[0] || null
  if (!shipment) {
    const error = new Error('发货单不存在或二维码已失效')
    error.code = 404
    throw error
  }

  return shipment
}

async function ensureDriverObject(shipment) {
  if (!shipment) {
    return
  }

  if (!shipment.driver || typeof shipment.driver !== 'object') {
    shipment.driver = {}
  }
}

module.exports = {
  'h5.shipmentInfo': shipmentInfo,
  'h5.driverStep1': driverStep1,
  'h5.driverStep2': driverStep2
}

Object.defineProperty(module.exports, '__test', {
  value: {
    ensureDriverObject
  }
})
