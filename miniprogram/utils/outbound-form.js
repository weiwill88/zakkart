function validateOutboundForm(form = {}) {
  if (!form.selectedSku) {
    return '请选择成品 SKU'
  }
  if (!Number(form.outboundQty || 0)) {
    return '请输入出库数量'
  }
  if (!String(form.destination || '').trim()) {
    return '请输入目的地'
  }
  return ''
}

module.exports = {
  validateOutboundForm
}
