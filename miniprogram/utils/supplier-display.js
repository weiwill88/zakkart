function mapCooperationStatus(status) {
  if (status === 'stopped') {
    return {
      status: 'stopped',
      statusText: '已停止',
      statusClass: 'badge-abnormal'
    }
  }

  return {
    status: status || 'active',
    statusText: '合作中',
    statusClass: 'badge-completed'
  }
}

module.exports = {
  mapCooperationStatus
}
