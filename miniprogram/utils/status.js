function getContractStatusLabel(status) {
  return {
    DRAFT: '草稿',
    PENDING_SIGN: '待签约',
    SIGNED: '已签署',
    EXECUTING: '执行中',
    COMPLETED: '已完成'
  }[status] || status || '-'
}

function getContractStatusClass(status) {
  return {
    DRAFT: 'badge-pending',
    PENDING_SIGN: 'badge-pending',
    SIGNED: 'badge-in-progress',
    EXECUTING: 'badge-in-progress',
    COMPLETED: 'badge-completed'
  }[status] || 'badge-pending'
}

function getSupplierConfirmStatusLabel(status) {
  return {
    UNSENT: '未发起确认',
    PENDING_CONFIRM: '待确认',
    CONFIRMED: '已确认'
  }[status] || '未发起确认'
}

function getSupplierConfirmStatusClass(status) {
  return {
    UNSENT: 'badge-pending',
    PENDING_CONFIRM: 'badge-pending',
    CONFIRMED: 'badge-completed'
  }[status] || 'badge-pending'
}

function getPartStatusLabel(status) {
  return {
    PENDING_PRODUCTION: '待生产',
    PENDING_INSPECTION: '已生产待验货',
    PENDING_SHIPMENT: '已验货待发货',
    VEHICLE_DISPATCHED: '已派车',
    IN_TRANSIT: '运输中',
    ARRIVED: '已到达'
  }[status] || status || '-'
}

function getPartStatusClass(status) {
  return {
    PENDING_PRODUCTION: 'badge-pending',
    PENDING_INSPECTION: 'badge-pending',
    PENDING_SHIPMENT: 'badge-completed',
    VEHICLE_DISPATCHED: 'badge-in-progress',
    IN_TRANSIT: 'badge-in-progress',
    ARRIVED: 'badge-completed'
  }[status] || 'badge-pending'
}

function getInspectionStatusLabel(displayStatus, result) {
  if (displayStatus === 'FAILED' || result === 'FAIL') return '验货未通过'
  if (displayStatus === 'PARTIAL_PASS' || result === 'PARTIAL_PASS') return '部分通过待处理'
  if (displayStatus === 'PASS' || result === 'PASS' || displayStatus === 'PENDING_SHIPMENT') return '验货通过待发货'
  return '已生产待验货'
}

function getInspectionStatusClass(displayStatus, result) {
  if (displayStatus === 'FAILED' || result === 'FAIL') return 'badge-abnormal'
  if (displayStatus === 'PARTIAL_PASS' || result === 'PARTIAL_PASS') return 'badge-in-progress'
  if (displayStatus === 'PASS' || result === 'PASS' || displayStatus === 'PENDING_SHIPMENT') return 'badge-completed'
  return 'badge-pending'
}

function getShipmentStatusLabel(status) {
  return {
    CREATED: '待司机接单',
    VEHICLE_DISPATCHED: '已派车',
    IN_TRANSIT: '在途运输',
    ARRIVED: '已到达'
  }[status] || status || '-'
}

function getShipmentStatusClass(status) {
  return {
    CREATED: 'badge-pending',
    VEHICLE_DISPATCHED: 'badge-in-progress',
    IN_TRANSIT: 'badge-in-progress',
    ARRIVED: 'badge-completed'
  }[status] || 'badge-pending'
}

module.exports = {
  getContractStatusLabel,
  getContractStatusClass,
  getSupplierConfirmStatusLabel,
  getSupplierConfirmStatusClass,
  getPartStatusLabel,
  getPartStatusClass,
  getInspectionStatusLabel,
  getInspectionStatusClass,
  getShipmentStatusLabel,
  getShipmentStatusClass
}
