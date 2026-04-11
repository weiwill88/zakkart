export function getContractStatusLabel(status) {
  return {
    DRAFT: '草稿',
    PENDING_SIGN: '待签约',
    SIGNED: '已签署',
    EXECUTING: '执行中',
    COMPLETED: '已完成'
  }[status] || status || '-'
}

export function getContractStatusTagType(status) {
  return {
    DRAFT: 'info',
    PENDING_SIGN: 'warning',
    SIGNED: 'success',
    EXECUTING: 'primary',
    COMPLETED: 'success'
  }[status] || 'info'
}

export function getSupplierConfirmStatusLabel(status) {
  return {
    UNSENT: '未发起确认',
    PENDING_CONFIRM: '待供应商确认',
    CONFIRMED: '供应商已确认'
  }[status] || '未发起确认'
}

export function getSupplierConfirmStatusTagType(status) {
  return {
    UNSENT: 'info',
    PENDING_CONFIRM: 'warning',
    CONFIRMED: 'success'
  }[status] || 'info'
}

export function getGoodsStatusLabel(status) {
  return {
    PENDING_PRODUCTION: '待生产',
    PENDING_INSPECTION: '已生产待验货',
    PENDING_SHIPMENT: '已验货待发货',
    VEHICLE_DISPATCHED: '已派车',
    IN_TRANSIT: '在途运输',
    ARRIVED: '已到达'
  }[status] || status || '-'
}

export function getGoodsStatusTagType(status) {
  return {
    PENDING_PRODUCTION: 'info',
    PENDING_INSPECTION: 'warning',
    PENDING_SHIPMENT: 'success',
    VEHICLE_DISPATCHED: 'primary',
    IN_TRANSIT: 'primary',
    ARRIVED: 'success'
  }[status] || 'info'
}

export function getInspectionDisplayStatusLabel(status) {
  return {
    PENDING_INSPECTION: '已生产待验货',
    PASS: '验货通过待发货',
    PARTIAL_PASS: '部分通过待处理',
    FAILED: '验货未通过',
    PENDING_SHIPMENT: '验货通过待发货'
  }[status] || status || '-'
}

export function getInspectionDisplayStatusTagType(status) {
  return {
    PENDING_INSPECTION: 'warning',
    PASS: 'success',
    PARTIAL_PASS: 'primary',
    FAILED: 'danger',
    PENDING_SHIPMENT: 'success'
  }[status] || 'info'
}

export function getInspectionResultLabel(result) {
  return {
    PASS: '全部通过',
    PARTIAL_PASS: '部分通过',
    FAIL: '不通过'
  }[result] || result || '-'
}
