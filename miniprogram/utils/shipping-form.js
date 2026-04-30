function normalizeAddressOptions(list = []) {
  return (list || []).map(item => ({
    ...item,
    id: item._id || item.id,
    label: item.label || item.detail || item.org_name || '未命名地址'
  })).filter(item => item.id)
}

function resolveDestinationType(candidates = [], orgDetail = {}) {
  const selected = (candidates || []).filter(item => item.selected)
  if (selected.length > 0) {
    return selected[0].destinationType || 'assembly'
  }

  return orgDetail && orgDetail.has_assembly ? 'freight' : 'assembly'
}

module.exports = {
  normalizeAddressOptions,
  resolveDestinationType
}
