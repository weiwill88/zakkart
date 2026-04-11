async function getTempFileURLMap(fileIds = []) {
  const normalized = Array.from(new Set((fileIds || []).filter(Boolean)))
  if (normalized.length === 0) {
    return {}
  }

  const result = await wx.cloud.getTempFileURL({
    fileList: normalized.map((fileID) => ({ fileID, maxAge: 3600 }))
  })
  return (result.fileList || []).reduce((acc, item) => {
    const fileID = item.fileID || item.fileId
    const tempFileURL = item.tempFileURL || item.download_url || item.tempFileUrl
    if (fileID && tempFileURL) {
      acc[fileID] = tempFileURL
    }
    return acc
  }, {})
}

async function openCloudDocument(fileId) {
  const downloadResult = await new Promise((resolve, reject) => {
    wx.cloud.downloadFile({
      fileID: fileId,
      success: resolve,
      fail: reject
    })
  })

  if (!downloadResult.tempFilePath) {
    throw new Error('文件下载失败')
  }

  await new Promise((resolve, reject) => {
    wx.openDocument({
      filePath: downloadResult.tempFilePath,
      showMenu: true,
      success: resolve,
      fail: reject
    })
  })
}

async function openDocumentUrl(url) {
  if (!url) {
    throw new Error('文件地址获取失败')
  }

  const filePath = `${wx.env.USER_DATA_PATH}/signed-contract-${Date.now()}.pdf`
  const downloadResult = await new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      filePath,
      success: resolve,
      fail: reject
    })
  })

  if (downloadResult.statusCode && downloadResult.statusCode !== 200) {
    throw new Error('文件下载失败')
  }

  const localFilePath = downloadResult.filePath || downloadResult.tempFilePath || ''
  if (!localFilePath) {
    throw new Error('文件下载失败')
  }

  await new Promise((resolve, reject) => {
    wx.openDocument({
      filePath: localFilePath,
      fileType: 'pdf',
      showMenu: true,
      success: resolve,
      fail: reject
    })
  })
}

module.exports = {
  getTempFileURLMap,
  openCloudDocument,
  openDocumentUrl
}
