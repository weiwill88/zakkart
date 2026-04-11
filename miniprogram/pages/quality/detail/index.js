const { callApi } = require('../../../utils/api')
const { showToast } = require('../../../utils/util')
const { getInspectionStatusLabel, getInspectionStatusClass } = require('../../../utils/status')
const { getTempFileURLMap } = require('../../../utils/cloud')

Page({
  data: {
    qc: {},
    isAdmin: false,
    canInspect: false,
    mediaItems: [],
    localMediaFiles: [],
    form: {
      result: 'PASS',
      qualifiedQty: 0,
      defectQty: 0,
      defectDesc: '',
      note: ''
    },
    submitting: false
  },

  onLoad(options) {
    this.batchPartId = options.id
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const isAdmin = app.getRole() === 'admin'
    const canInspect = isAdmin && app.getAdminModuleAccess().quality

    try {
      const result = await callApi('inspection.list', { batchPartId: this.batchPartId })
      const item = (result.list || [])[0]
      if (!item) {
        showToast('质检记录不存在')
        return
      }

      const latest = item.latestInspection || {}
      const totalQty = Number(item.actualQty || item.plannedQty || 0)
      const mediaItems = await buildMediaItems(latest.defects || [])
      this.setData({
        qc: {
          partName: item.partName,
          supplierName: item.supplierName,
          contractNo: item.contractNo,
          batchNo: `第 ${item.batchNo} 批`,
          totalQty,
          plannedQty: Number(item.plannedQty || 0),
          passedQty: latest.qualified_qty || 0,
          defectQty: latest.defect_qty || 0,
          defectDetails: latest.defect_desc || '暂无',
          report: latest.note || '暂无备注',
          status: item.displayStatus,
          statusLabel: getInspectionStatusLabel(item.displayStatus, latest.result),
          badgeClass: getInspectionStatusClass(item.displayStatus, latest.result),
          inspectDate: formatDate(latest.inspected_at || item.statusUpdatedAt)
        },
        isAdmin,
        canInspect,
        mediaItems,
        localMediaFiles: [],
        form: {
          result: 'PASS',
          qualifiedQty: totalQty,
          defectQty: 0,
          defectDesc: '',
          note: ''
        }
      })
    } catch (error) {
      showToast(error.message || '加载质检详情失败')
    }
  },

  onPreviewImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = (this.data.mediaItems || []).filter(item => item.mediaType === 'image').map(item => item.url)
    if (!current || urls.length === 0) return
    wx.previewImage({ current, urls })
  },

  onResultChange(e) {
    const result = e.detail.value
    const totalQty = Number(this.data.qc.totalQty || 0)
    const nextForm = {
      ...this.data.form,
      result
    }

    if (result === 'PASS') {
      nextForm.qualifiedQty = totalQty
      nextForm.defectQty = 0
    } else if (result === 'FAIL') {
      nextForm.qualifiedQty = 0
      nextForm.defectQty = totalQty
    }

    this.setData({ form: nextForm })
  },

  onQualifiedQtyChange(e) {
    const value = Number(e.detail.value || 0)
    const totalQty = Number(this.data.qc.totalQty || 0)
    const qualifiedQty = clampNumber(value, 0, totalQty)
    this.setData({
      'form.qualifiedQty': qualifiedQty,
      'form.defectQty': clampNumber(totalQty - qualifiedQty, 0, totalQty)
    })
  },

  onDefectQtyChange(e) {
    const value = Number(e.detail.value || 0)
    const totalQty = Number(this.data.qc.totalQty || 0)
    const defectQty = clampNumber(value, 0, totalQty)
    this.setData({
      'form.defectQty': defectQty,
      'form.qualifiedQty': clampNumber(totalQty - defectQty, 0, totalQty)
    })
  },

  onDefectDescInput(e) {
    this.setData({ 'form.defectDesc': e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ 'form.note': e.detail.value })
  },

  async onChooseMedia() {
    try {
      const result = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 9,
          mediaType: ['image', 'video'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject
        })
      })

      const current = this.data.localMediaFiles || []
      const appended = (result.tempFiles || []).map((file, index) => ({
        id: `local_${Date.now()}_${index}`,
        tempFilePath: file.tempFilePath,
        mediaType: file.fileType === 'video' ? 'video' : 'image',
        size: file.size || 0
      }))
      this.setData({
        localMediaFiles: current.concat(appended).slice(0, 9)
      })
    } catch (error) {
      if (!String(error.errMsg || '').includes('cancel')) {
        showToast('选择附件失败')
      }
    }
  },

  onPreviewLocalImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = (this.data.localMediaFiles || []).filter(item => item.mediaType === 'image').map(item => item.tempFilePath)
    if (!current || urls.length === 0) return
    wx.previewImage({ current, urls })
  },

  onRemoveLocalMedia(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      localMediaFiles: (this.data.localMediaFiles || []).filter(item => item.id !== id)
    })
  },

  async onSubmitInspection() {
    if (!this.data.isAdmin || !this.data.canInspect) {
      showToast('当前账号没有提交验货结果权限')
      return
    }

    if (this.data.qc.status !== 'PENDING_INSPECTION') {
      showToast('当前状态不允许再次提交验货')
      return
    }

    this.setData({ submitting: true })
    try {
      const defects = []
      for (const file of this.data.localMediaFiles || []) {
        const extension = file.mediaType === 'video' ? 'mp4' : 'jpg'
        const upload = await wx.cloud.uploadFile({
          cloudPath: `inspection/${this.batchPartId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`,
          filePath: file.tempFilePath
        })
        defects.push({
          photo_file_id: upload.fileID,
          media_type: file.mediaType,
          description: this.data.form.defectDesc || ''
        })
      }

      await callApi('inspection.create', {
        batchPartId: this.batchPartId,
        result: this.data.form.result,
        qualifiedQty: Number(this.data.form.qualifiedQty || 0),
        defectQty: Number(this.data.form.defectQty || 0),
        defectDesc: this.data.form.defectDesc,
        note: this.data.form.note,
        defects
      })

      showToast('验货结果已提交', 'success')
      this.loadData()
    } catch (error) {
      showToast(error.message || '提交验货失败')
    } finally {
      this.setData({ submitting: false })
    }
  }
})

function formatDate(value) {
  if (!value) return '待安排'
  return String(value).slice(0, 10).replace(/-/g, '/')
}

async function buildMediaItems(defects) {
  const list = Array.isArray(defects) ? defects : []
  const fileIds = list.map(item => item.photo_file_id).filter(Boolean)
  const urlMap = await getTempFileURLMap(fileIds)
  return list
    .map((item, index) => ({
      id: item.defect_id || `media_${index}`,
      mediaType: item.media_type === 'video' ? 'video' : 'image',
      description: item.description || '',
      url: urlMap[item.photo_file_id] || ''
    }))
    .filter(item => item.url)
}

function clampNumber(value, min, max) {
  const number = Number(value || 0)
  if (Number.isNaN(number)) return min
  return Math.max(min, Math.min(max, number))
}
