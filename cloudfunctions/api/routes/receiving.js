const { getCollection, command } = require('../config/database')
const { ensureSupplierOrAdmin, ensureSupplierPermission, isAdminRole, isSupplierRole } = require('../utils/access')
const { buildShipmentSummary } = require('../utils/shipment')

const SHIPMENTS_COLLECTION = 'shipment_orders'

async function pending({ auth }) {
  ensureSupplierOrAdmin(auth, '无权限查看待收货列表')
  if (isSupplierRole(auth?.role)) {
    await ensureSupplierPermission(auth, ['confirm_receiving'], '当前账号没有查看待收货的权限')
  }

  const _ = command
  const conditions = [
    { status: 'IN_TRANSIT' }
  ]

  if (isSupplierRole(auth?.role)) {
    conditions.push({ to_org_id: auth.org_id })
  }

  if (isAdminRole(auth?.role) && auth?.role === 'merchandiser') {
    conditions.push({ destination_type: _.in(['assembly', 'freight']) })
  }

  const result = await getCollection(SHIPMENTS_COLLECTION)
    .where(_.and(conditions))
    .orderBy('created_at', 'desc')
    .get()

  return {
    list: (result.data || []).map(buildShipmentSummary)
  }
}

module.exports = {
  'receiving.pending': pending
}
