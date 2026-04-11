const cloud = require('wx-server-sdk')
const { getCollection, command, createKeywordRegExp } = require('../config/database')
const { ensureAdmin, ensureSupplierOrAdmin, ensureSupplierPermission, hasSupplierPermission, isAdminRole, isSupplierRole } = require('../utils/access')
const {
  generateShipmentNo,
  createH5Token,
  buildH5Url,
  findAddressById,
  resolveShipmentTarget,
  updateTargetStatus,
  syncContractStatus,
  safeCreateNotification,
  buildShipmentSummary,
  completeShipmentArrival
} = require('../utils/shipment')

const SHIPMENTS_COLLECTION = 'shipment_orders'
const FREIGHT_COLLECTION = 'freight_documents'
const ORGS_COLLECTION = 'organizations'
const CONTRACTS_COLLECTION = 'contracts'
const PRODUCTS_COLLECTION = 'products'

async function create({ params = {}, auth }) {
  ensureSupplierOrAdmin(auth, '无权限创建发货单')
  if (!isSupplierRole(auth?.role)) {
    const error = new Error('当前仅供应商/组装厂可创建发货单')
    error.code = 403
    throw error
  }
  await ensureSupplierPermission(auth, ['create_shipment'], '当前账号没有创建发货单权限')

  const { fromAddressId, toAddressId, items = [] } = params
  if (!fromAddressId || !toAddressId) {
    const error = new Error('缺少发货地址或目的地地址')
    error.code = 400
    throw error
  }
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('至少需要一条发货明细')
    error.code = 400
    throw error
  }

  const fromAddress = await findAddressById(fromAddressId)
  const toAddress = await findAddressById(toAddressId)
  if (!fromAddress || !toAddress) {
    const error = new Error('发货地址或目的地地址不存在')
    error.code = 404
    throw error
  }
  if (fromAddress.org_id !== auth.org_id) {
    const error = new Error('所选发货地址不属于当前组织')
    error.code = 403
    throw error
  }
  const shipperOrg = await getCollection(ORGS_COLLECTION).doc(auth.org_id).get().catch(() => ({ data: null }))

  const normalizedItems = []
  let shipperOrgId = ''
  let shipperName = ''
  let needConfirm = false
  let expectedDestinationType = ''

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {}
    const target = await resolveShipmentTarget(item)
    if (!target) {
      const error = new Error(`第 ${index + 1} 条发货明细对应对象不存在`)
      error.code = 404
      throw error
    }
    if (target.shipperOrgId !== auth.org_id) {
      const error = new Error('发货单内存在不属于当前组织的货物')
      error.code = 403
      throw error
    }
    if (target.currentStatus !== 'PENDING_SHIPMENT') {
      const error = new Error(`${target.itemName || '货物'} 当前不处于待发货状态`)
      error.code = 409
      throw error
    }

    const plannedQty = Number(target.plannedQty || 0)
    const actualQty = Number(item.actualQty != null ? item.actualQty : plannedQty)
    if (!Number.isFinite(actualQty) || actualQty <= 0) {
      const error = new Error(`第 ${index + 1} 条发货明细数量不正确`)
      error.code = 400
      throw error
    }

    const qtyModified = actualQty !== plannedQty
    if (qtyModified && !String(item.qtyModifyReason || '').trim()) {
      const error = new Error(`第 ${index + 1} 条发货明细缺少数量修改原因`)
      error.code = 400
      throw error
    }

    if (!shipperOrgId) {
      shipperOrgId = target.shipperOrgId
      shipperName = target.shipperName
    }
    if (shipperOrgId !== target.shipperOrgId) {
      const error = new Error('同一发货单内只能包含同一发货方的货物')
      error.code = 400
      throw error
    }

    const destinationType = await resolveDestinationType(target, shipperOrg.data || null)
    if (!expectedDestinationType) {
      expectedDestinationType = destinationType
    }
    if (expectedDestinationType !== destinationType) {
      const error = new Error('不同目的地规则的货物不能合并到同一发货单')
      error.code = 400
      throw error
    }

    needConfirm = needConfirm || qtyModified

    normalizedItems.push({
      item_id: `si_${Date.now()}_${index}`,
      batch_part_id: item.batchPartId || null,
      batch_id: target.batchId || null,
      assembly_order_id: item.assemblyOrderId || null,
      item_name: target.itemName || '',
      planned_qty: plannedQty,
      actual_qty: actualQty,
      qty_modify_reason: qtyModified ? String(item.qtyModifyReason || '').trim() : '',
      is_free_replenish: Boolean(item.isFreeReplenish),
      has_exception: false,
      exception_note: '',
      actual_received_qty: null,
      diff_qty: null,
      destination_type: destinationType
    })
  }

  if (expectedDestinationType && toAddress.type !== expectedDestinationType) {
    const error = new Error(expectedDestinationType === 'assembly'
      ? '当前货物只能发往组装厂地址'
      : '当前货物只能发往货代地址')
    error.code = 400
    throw error
  }

  const now = new Date().toISOString()
  const h5Token = createH5Token()
  const doc = {
    shipment_no: await generateShipmentNo(),
    shipper_org_id: shipperOrgId,
    shipper_name: shipperName,
    from_address_id: fromAddress._id,
    from_address_label: fromAddress.label || '',
    to_address_id: toAddress._id,
    to_address_label: toAddress.label || '',
    to_org_id: toAddress.org_id || '',
    to_org_name: toAddress.org_name || '',
    destination_type: toAddress.type || '',
    status: 'CREATED',
    workflow_status: needConfirm ? 'PENDING_CONFIRM' : 'READY',
    h5_token: h5Token,
    h5_url: buildH5Url(h5Token),
    confirmed_by: null,
    confirmed_at: null,
    need_confirm: needConfirm,
    qr_code_file_id: '',
    freight_doc_id: null,
    items: normalizedItems,
    driver: {},
    arrival_photos: [],
    arrival_confirmed_by: null,
    arrival_confirmed_at: null,
    created_at: now
  }

  const addResult = await getCollection(SHIPMENTS_COLLECTION).add({ data: doc })

  if (needConfirm) {
    await safeCreateNotification({
      type: 'shipment_needs_confirm',
      title: '发货数量待确认',
      content: `${doc.shipment_no} 存在数量调整，待甲方确认`,
      receiverRole: 'admin',
      targetType: 'shipment',
      targetId: addResult._id
    })
  }

  return {
    shipmentId: addResult._id,
    shipmentNo: doc.shipment_no,
    h5Token,
    h5Url: doc.h5_url,
    qrCodeFileId: '',
    needConfirm
  }
}

async function resolveDestinationType(target, shipperOrg) {
  if (target.kind === 'assembly_order') {
    return 'freight'
  }

  if (!target.contractId) {
    return shipperOrg?.has_assembly ? 'freight' : 'assembly'
  }

  const contractResult = await getCollection(CONTRACTS_COLLECTION).doc(target.contractId).get().catch(() => ({ data: null }))
  const contract = contractResult.data || null
  if (!contract?.product_id) {
    return shipperOrg?.has_assembly ? 'freight' : 'assembly'
  }

  const productResult = await getCollection(PRODUCTS_COLLECTION).doc(contract.product_id).get().catch(() => ({ data: null }))
  const productType = productResult.data?.type || ''

  if (productType === 'simple' || productType === 'accessory') {
    return 'freight'
  }

  return 'assembly'
}

async function list({ params = {}, auth }) {
  ensureSupplierOrAdmin(auth)

  const { page = 1, pageSize = 20, status, keyword } = params
  const _ = command
  const conditions = []

  if (status) {
    conditions.push({ status })
  }
  if (keyword) {
    const keywordRegExp = createKeywordRegExp(keyword)
    conditions.push(_.or([
      { shipment_no: keywordRegExp },
      { shipper_name: keywordRegExp },
      { to_address_label: keywordRegExp }
    ]))
  }

  if (isSupplierRole(auth?.role)) {
    const canViewOutbound = await hasSupplierPermission(auth, ['view_shipment', 'create_shipment'])
    const canConfirmReceiving = await hasSupplierPermission(auth, ['confirm_receiving'])
    if (!canViewOutbound && !canConfirmReceiving) {
      const error = new Error('当前账号没有查看发货单权限')
      error.code = 403
      throw error
    }

    const orgConditions = []
    if (canViewOutbound) {
      orgConditions.push({ shipper_org_id: auth.org_id })
    }
    if (canConfirmReceiving) {
      orgConditions.push({ to_org_id: auth.org_id })
    }
    conditions.push(orgConditions.length === 1 ? orgConditions[0] : _.or(orgConditions))
  }

  const col = getCollection(SHIPMENTS_COLLECTION)
  const whereClause = conditions.length > 0 ? col.where(_.and(conditions)) : col
  const countResult = await whereClause.count()
  const total = countResult.total
  const skip = (page - 1) * pageSize
  const result = await whereClause
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    list: (result.data || []).map(buildShipmentSummary),
    total,
    page,
    pageSize
  }
}

async function detail({ params = {}, auth }) {
  ensureSupplierOrAdmin(auth)

  const { id } = params
  if (!id) {
    const error = new Error('缺少发货单 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(SHIPMENTS_COLLECTION).doc(id).get()
  const shipment = result.data
  if (!shipment) {
    const error = new Error('发货单不存在')
    error.code = 404
    throw error
  }

  if (!isAdminRole(auth?.role)) {
    const isOutbound = shipment.shipper_org_id === auth.org_id
    const isInbound = shipment.to_org_id === auth.org_id
    if (!isOutbound && !isInbound) {
      const error = new Error('无权查看该发货单')
      error.code = 403
      throw error
    }

    const canViewOutbound = await hasSupplierPermission(auth, ['view_shipment', 'create_shipment'])
    const canConfirmReceiving = await hasSupplierPermission(auth, ['confirm_receiving'])
    const canViewCurrentShipment = (isOutbound && canViewOutbound) || (isInbound && canConfirmReceiving)
    if (!canViewCurrentShipment) {
      const error = new Error('当前账号没有查看该发货单的权限')
      error.code = 403
      throw error
    }
  }

  let freightDocument = null
  if (shipment.freight_doc_id) {
    try {
      const freightResult = await getCollection(FREIGHT_COLLECTION).doc(shipment.freight_doc_id).get()
      freightDocument = freightResult.data || null
    } catch (error) {
      freightDocument = null
    }
  }

  const driverAssets = await resolveDriverAssets(shipment.driver || {})

  return {
    ...buildShipmentSummary(shipment),
    driver: {
      ...(shipment.driver || {}),
      ...driverAssets
    },
    freightDocument
  }
}

async function confirmQty({ params = {}, auth }) {
  ensureAdmin(auth)

  const { id, decision = 'CONFIRM' } = params
  if (!id) {
    const error = new Error('缺少发货单 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(SHIPMENTS_COLLECTION).doc(id).get()
  const shipment = result.data
  if (!shipment) {
    const error = new Error('发货单不存在')
    error.code = 404
    throw error
  }

  if (!shipment.need_confirm) {
    return {
      shipmentId: id,
      needConfirm: false,
      workflowStatus: shipment.workflow_status || 'READY'
    }
  }

  const normalizedDecision = String(decision || 'CONFIRM').toUpperCase()
  const now = new Date().toISOString()
  if (normalizedDecision === 'REINSPECT') {
    for (const item of shipment.items || []) {
      const target = await resolveShipmentTarget({
        batchPartId: item.batch_part_id,
        assemblyOrderId: item.assembly_order_id
      })
      if (target && Number(item.actual_qty || 0) > Number(item.planned_qty || 0)) {
        await updateTargetStatus(target, 'PENDING_INSPECTION', {
          actual_qty: Number(item.actual_qty || item.planned_qty || 0)
        })
      }
    }

    await getCollection(SHIPMENTS_COLLECTION).doc(id).update({
      data: {
        workflow_status: 'REINSPECT_REQUIRED',
        updated_at: now
      }
    })

    return {
      shipmentId: id,
      workflowStatus: 'REINSPECT_REQUIRED'
    }
  }

  await getCollection(SHIPMENTS_COLLECTION).doc(id).update({
    data: {
      confirmed_by: auth.user_id || '',
      confirmed_at: now,
      workflow_status: 'READY',
      updated_at: now
    }
  })

  return {
    shipmentId: id,
    confirmedBy: auth.user_id || '',
    confirmedAt: now,
    workflowStatus: 'READY'
  }
}

async function qrcode({ params = {}, auth }) {
  ensureSupplierOrAdmin(auth)
  const { id } = params
  if (!id) {
    const error = new Error('缺少发货单 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(SHIPMENTS_COLLECTION).doc(id).get()
  const shipment = result.data
  if (!shipment) {
    const error = new Error('发货单不存在')
    error.code = 404
    throw error
  }
  if (!isAdminRole(auth?.role) && shipment.shipper_org_id !== auth.org_id) {
    const error = new Error('无权查看该发货单二维码')
    error.code = 403
    throw error
  }
  if (isSupplierRole(auth?.role)) {
    await ensureSupplierPermission(auth, ['view_shipment', 'create_shipment'], '当前账号没有查看发货单二维码权限')
  }

  return {
    shipmentId: shipment._id,
    shipmentNo: shipment.shipment_no,
    h5Token: shipment.h5_token,
    h5Url: shipment.h5_url || buildH5Url(shipment.h5_token),
    qrCodeFileId: shipment.qr_code_file_id || ''
  }
}

async function confirmArrival({ params = {}, auth }) {
  ensureSupplierOrAdmin(auth)
  if (isSupplierRole(auth?.role)) {
    await ensureSupplierPermission(auth, ['confirm_receiving'], '当前账号没有确认收货权限')
  }

  const { id, items = [], photos = [] } = params
  if (!id) {
    const error = new Error('缺少发货单 ID')
    error.code = 400
    throw error
  }

  const result = await getCollection(SHIPMENTS_COLLECTION).doc(id).get()
  const shipment = result.data
  if (!shipment) {
    const error = new Error('发货单不存在')
    error.code = 404
    throw error
  }

  if (shipment.status !== 'IN_TRANSIT') {
    const error = new Error('当前状态不允许确认到达')
    error.code = 409
    throw error
  }

  if (isSupplierRole(auth?.role) && shipment.to_org_id !== auth.org_id) {
    const error = new Error('无权确认该发货单到达')
    error.code = 403
    throw error
  }

  const arrivalResult = await completeShipmentArrival({
    shipment,
    authUserId: auth.user_id || '',
    items,
    photos,
    skipInventory: shipment.destination_type === 'freight'
  })

  await safeCreateNotification({
    type: 'shipment_arrived',
    title: '发货单已到达',
    content: `${shipment.shipment_no} 已完成收货确认`,
    receiverRole: 'admin',
    targetType: 'shipment',
    targetId: shipment._id
  })

  return arrivalResult
}

module.exports = {
  'shipment.create': create,
  'shipment.list': list,
  'shipment.detail': detail,
  'shipment.confirmQty': confirmQty,
  'shipment.qrcode': qrcode,
  'shipment.confirmArrival': confirmArrival
}

async function resolveDriverAssets(driver = {}) {
  const signatureFileId = String(driver.signature_file_id || '').trim()
  const loadingPhotoFileId = String(driver.loading_photo_file_id || '').trim()
  const fileIds = [signatureFileId, loadingPhotoFileId].filter(Boolean)
  let urlMap = {}

  if (fileIds.length > 0) {
    const tempResult = await cloud.getTempFileURL({
      fileList: fileIds.map((fileID) => ({
        fileID,
        maxAge: 3600
      }))
    }).catch(() => ({ fileList: [] }))

    urlMap = (tempResult.fileList || []).reduce((acc, item) => {
      const fileID = item.fileID || item.fileId
      const tempUrl = item.tempFileURL || item.download_url || item.tempFileUrl || ''
      if (fileID && tempUrl && (!item.status || item.status === 0)) {
        acc[fileID] = tempUrl
      }
      return acc
    }, {})
  }

  return {
    signature_temp_url: signatureFileId ? (urlMap[signatureFileId] || '') : '',
    loading_photo_temp_url: loadingPhotoFileId ? (urlMap[loadingPhotoFileId] || '') : '',
    step1_gps_text: formatGps(driver.step1_gps_lat, driver.step1_gps_lng),
    step2_gps_text: formatGps(driver.step2_gps_lat, driver.step2_gps_lng)
  }
}

function formatGps(lat, lng) {
  const normalizedLat = lat != null ? Number(lat) : null
  const normalizedLng = lng != null ? Number(lng) : null
  if (!Number.isFinite(normalizedLat) || !Number.isFinite(normalizedLng)) {
    return ''
  }

  return `${normalizedLat.toFixed(6)}, ${normalizedLng.toFixed(6)}`
}
