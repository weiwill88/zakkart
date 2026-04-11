/**
 * 通用工具函数
 */

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '--'
  return dateStr.replace(/-/g, '/')
}

/**
 * 计算完成百分比
 */
function calcProgress(delivered, total) {
  if (!total || total === 0) return 0
  return Math.round((delivered / total) * 100)
}

/**
 * 格式化数字（千分位）
 */
function formatNumber(num) {
  if (num === undefined || num === null) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 跳转到页面
 */
function navigateTo(url) {
  wx.navigateTo({ url })
}

/**
 * 切换到 Tab 页面
 */
function switchTab(url) {
  wx.switchTab({ url })
}

/**
 * 显示 Toast
 */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 })
}

/**
 * 显示确认弹窗
 */
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => resolve(res.confirm)
    })
  })
}

/**
 * 获取时间差描述
 */
function getTimeDesc(dateStr) {
  if (!dateStr) return ''
  const target = new Date(dateStr.replace(/\//g, '-'))
  const now = new Date('2026-03-17') // 固定原型日期
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  if (diff > 0) return `还有${diff}天`
  if (diff === 0) return '今天'
  return `已过${Math.abs(diff)}天`
}

module.exports = {
  formatDate,
  calcProgress,
  formatNumber,
  navigateTo,
  switchTab,
  showToast,
  showConfirm,
  getTimeDesc
}
