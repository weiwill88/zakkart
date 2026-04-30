const ENV_ID = 'cloud1-0g855x4wc43be3c4'
const TOKEN = new URLSearchParams(window.location.search).get('token') || ''

const statusCard = document.getElementById('statusCard')
const shipmentNoEl = document.getElementById('shipmentNo')
const statusTextEl = document.getElementById('statusText')
const shipmentSummaryEl = document.getElementById('shipmentSummary')
const shipperNameEl = document.getElementById('shipperName')
const destinationNameEl = document.getElementById('destinationName')
const goodsListEl = document.getElementById('goodsList')
const goodsCountBadgeEl = document.getElementById('goodsCountBadge')
const driverStatusBadgeEl = document.getElementById('driverStatusBadge')
const driverInfoNameEl = document.getElementById('driverInfoName')
const driverInfoPlateEl = document.getElementById('driverInfoPlate')
const driverInfoPhoneEl = document.getElementById('driverInfoPhone')
const driverInfoStep1AtEl = document.getElementById('driverInfoStep1At')
const step1Card = document.getElementById('step1Card')
const step2Card = document.getElementById('step2Card')
const step1Button = document.getElementById('step1Button')
const step2Button = document.getElementById('step2Button')
const goodsCheckedEl = document.getElementById('goodsChecked')
const gpsStatusEl = document.getElementById('gpsStatus')
const signatureCanvas = document.getElementById('signatureCanvas')
const clearSignatureButton = document.getElementById('clearSignatureButton')

let app
let signaturePad = null

bootstrap().catch((error) => {
  renderError(error.message || '初始化失败')
})

async function bootstrap() {
  if (!TOKEN) {
    throw new Error('缺少发货单 token')
  }

  const sdk = getCloudbaseSDK()
  app = sdk.init({
    env: ENV_ID,
    region: 'ap-shanghai'
  })
  await ensureAnonymousLogin(app)

  step1Button.addEventListener('click', handleStep1)
  step2Button.addEventListener('click', handleStep2)
  clearSignatureButton.addEventListener('click', () => {
    if (signaturePad) {
      signaturePad.clear()
    }
  })
  signaturePad = setupSignaturePad(signatureCanvas)

  await loadShipment()
}

async function loadShipment() {
  const result = await callApi('h5.shipmentInfo', { token: TOKEN })
  const shipment = result.shipment || {}

  shipmentNoEl.textContent = shipment.shipment_no || '未找到发货单'
  statusCard.querySelector('.status-label').textContent = shipment.status || 'UNKNOWN'
  statusTextEl.textContent = buildStatusText(shipment)
  shipmentSummaryEl.textContent = `共 ${shipment.item_count || 0} 条明细，合计 ${shipment.actual_total_qty || shipment.planned_total_qty || 0} 件`
  shipperNameEl.textContent = shipment.shipper_name || '-'
  destinationNameEl.textContent = shipment.to_address_label || '-'
  goodsCountBadgeEl.textContent = `${shipment.item_count || 0} 条明细`
  goodsListEl.innerHTML = (shipment.items || [])
    .map((item, index) => {
      const actualQty = Number(item.actual_qty || 0)
      const plannedQty = Number(item.planned_qty || actualQty)
      const modifiedText = actualQty !== plannedQty ? `<p class="item-subline">计划 ${plannedQty} 件，实际发货 ${actualQty} 件</p>` : ''
      const reasonText = item.qty_modify_reason ? `<p class="item-subline">数量调整原因：${escapeHtml(item.qty_modify_reason)}</p>` : ''
      return `
        <li class="goods-item">
          <div class="goods-item-head">
            <span class="goods-item-index">#${index + 1}</span>
            <strong>${escapeHtml(item.item_name || '未命名货物')}</strong>
            <span class="goods-item-qty">${actualQty || plannedQty} 件</span>
          </div>
          ${modifiedText}
          ${reasonText}
        </li>
      `
    })
    .join('')

  renderDriverInfo(shipment.driver || null)
  step1Card.classList.toggle('hidden', !result.canStep1)
  step2Card.classList.toggle('hidden', !result.canStep2)
}

async function handleStep1() {
  const driverName = document.getElementById('driverName').value.trim()
  const plateNumber = document.getElementById('plateNumber').value.trim()
  const driverPhone = document.getElementById('driverPhone').value.trim()
  if (!driverName || !plateNumber) {
    return alert('请先填写司机姓名和车牌号')
  }

  toggleLoading(step1Button, true)
  try {
    await callApi('h5.driverStep1', {
      token: TOKEN,
      driverName,
      plateNumber,
      driverPhone
    })
    await loadShipment()
    if (!step2Card.classList.contains('hidden')) {
      step2Card.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    alert('接单成功。若司机已在现场，可直接继续完成 Step 2，无需再次扫码。')
  } catch (error) {
    alert(error.message || '接单失败')
  } finally {
    toggleLoading(step1Button, false)
  }
}

async function handleStep2() {
  const loadingPhotoFile = document.getElementById('loadingPhotoFile').files[0]
  if (!goodsCheckedEl.checked) {
    return alert('请先确认已核对货物清单和数量')
  }
  if (!loadingPhotoFile) {
    return alert('请拍摄装车照片')
  }

  toggleLoading(step2Button, true)
  gpsStatusEl.textContent = '正在采集定位和准备上传...'
  try {
    const signatureFile = await buildSignatureFile()
    const [signature, loadingPhoto, position] = await Promise.all([
      uploadFile(signatureFile, 'driver-sign'),
      uploadFile(loadingPhotoFile, 'driver-load'),
      getCurrentPosition().catch(() => ({ coords: { latitude: null, longitude: null } }))
    ])
    gpsStatusEl.textContent = position.coords.latitude != null && position.coords.longitude != null
      ? `定位已获取：${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
      : '未获取到定位，系统将继续提交交接记录。'

    await callApi('h5.driverStep2', {
      token: TOKEN,
      signatureFileId: signature.fileID || signature.fileId,
      loadingPhotoFileId: loadingPhoto.fileID || loadingPhoto.fileId,
      gpsLat: position.coords.latitude,
      gpsLng: position.coords.longitude
    })
    await loadShipment()
    alert('提货确认已提交。')
  } catch (error) {
    alert(error.message || '提交失败')
    gpsStatusEl.textContent = '定位或上传失败，请检查网络后重试。'
  } finally {
    toggleLoading(step2Button, false)
  }
}

async function uploadFile(file, prefix) {
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  return app.uploadFile({
    cloudPath: `h5/${prefix}/${Date.now()}_${safeName}`,
    filePath: file
  })
}

function callApi(action, params) {
  return app.callFunction({
    name: 'api',
    data: {
      action,
      params
    }
  }).then((response) => {
    const result = response.result || {}
    if (result.code !== 0) {
      throw new Error(result.message || '请求失败')
    }
    return result.data
  })
}

function getCloudbaseSDK() {
  const sdk = window.cloudbase || window.tcb
  if (!sdk || typeof sdk.init !== 'function') {
    throw new Error('云开发 SDK 加载失败，请检查静态页面脚本地址和网络可达性')
  }
  return sdk
}

async function ensureAnonymousLogin(appInstance) {
  const authApi = resolveAuthApi(appInstance)

  try {
    if (typeof authApi.getAuthState === 'function') {
      const authState = await authApi.getAuthState()
      if (authState) {
        return authState
      }
    } else if (typeof authApi.getLoginState === 'function') {
      const loginState = await authApi.getLoginState()
      if (loginState) {
        return loginState
      }
    }

    if (typeof authApi.signInAnonymously === 'function') {
      const result = await authApi.signInAnonymously()
      if (result && result.error) {
        throw new Error(result.error.message || '匿名登录失败')
      }
      return result
    }

    if (typeof authApi.anonymousAuthProvider === 'function') {
      await authApi.anonymousAuthProvider().signIn()
      return true
    }

    throw new Error('当前云开发 SDK 不支持匿名登录')
  } catch (error) {
    const message = String(error?.message || '')
    if (message.includes('ACCESS_TOKEN_DISABLED')) {
      throw new Error('当前环境未启用新版匿名登录。请先升级到最新版静态页面，并到云开发控制台开启“身份认证 > 登录方式 > 匿名登录”。')
    }
    throw error
  }
}

function resolveAuthApi(appInstance) {
  if (appInstance && typeof appInstance.auth === 'function') {
    return appInstance.auth({ persistence: 'local' })
  }

  if (appInstance && appInstance.auth) {
    return appInstance.auth
  }

  throw new Error('当前页面未获取到云开发认证模块')
}

function buildStatusText(shipment) {
  if (shipment.status === 'CREATED' && shipment.need_confirm && !shipment.confirmed_at) {
    return '当前发货单仍待甲方确认数量，暂不可接单。'
  }
  if (shipment.status === 'CREATED') {
    return '请先登记司机姓名、车牌号并确认接单。司机可提前登记，也可到现场后补登记。'
  }
  if (shipment.status === 'VEHICLE_DISPATCHED') {
    return '车辆信息已登记，请在现场装货并核对数量后完成确认提货。若已在当前页面，可直接继续下一步。'
  }
  if (shipment.status === 'IN_TRANSIT') {
    return '货物已发出，等待收货方确认到达。'
  }
  if (shipment.status === 'ARRIVED') {
    return '该发货单已完成。'
  }
  return '请按页面提示完成交接。'
}

function toggleLoading(button, loading) {
  button.disabled = loading
  if (button === step1Button) {
    button.textContent = loading ? '提交中...' : '确认接单'
    return
  }
  button.textContent = loading ? '提交中...' : '核对无误并确认提货'
}

function renderError(message) {
  shipmentNoEl.textContent = '发货单加载失败'
  statusTextEl.textContent = message
  shipmentSummaryEl.textContent = ''
  step1Card.classList.add('hidden')
  step2Card.classList.add('hidden')
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000
    })
  })
}

function renderDriverInfo(driver) {
  const hasDriver = Boolean(driver && (driver.driver_name || driver.plate_number))
  driverStatusBadgeEl.textContent = hasDriver ? '已登记' : '待登记'
  driverStatusBadgeEl.className = `mini-badge ${hasDriver ? 'mini-badge-primary' : 'mini-badge-muted'}`
  driverInfoNameEl.textContent = driver?.driver_name || '-'
  driverInfoPlateEl.textContent = driver?.plate_number || '-'
  driverInfoPhoneEl.textContent = driver?.driver_phone || '-'
  driverInfoStep1AtEl.textContent = formatDateTime(driver?.step1_at)
}

function setupSignaturePad(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const ctx = canvas.getContext('2d')
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  ctx.scale(ratio, ratio)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2.4
  ctx.strokeStyle = '#0f172a'

  let drawing = false
  let hasStroke = false

  function getPoint(event) {
    const source = event.touches ? event.touches[0] : event
    const bounds = canvas.getBoundingClientRect()
    return {
      x: source.clientX - bounds.left,
      y: source.clientY - bounds.top
    }
  }

  function start(event) {
    drawing = true
    const point = getPoint(event)
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    hasStroke = true
    event.preventDefault()
  }

  function move(event) {
    if (!drawing) return
    const point = getPoint(event)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    event.preventDefault()
  }

  function end(event) {
    if (!drawing) return
    drawing = false
    ctx.closePath()
    event.preventDefault()
  }

  canvas.addEventListener('mousedown', start)
  canvas.addEventListener('mousemove', move)
  window.addEventListener('mouseup', end)
  canvas.addEventListener('touchstart', start, { passive: false })
  canvas.addEventListener('touchmove', move, { passive: false })
  window.addEventListener('touchend', end, { passive: false })

  return {
    clear() {
      ctx.clearRect(0, 0, rect.width, rect.height)
      hasStroke = false
    },
    hasStroke() {
      return hasStroke
    },
    toBlob() {
      return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.92)
      })
    }
  }
}

async function buildSignatureFile() {
  if (signaturePad && signaturePad.hasStroke()) {
    const blob = await signaturePad.toBlob()
    if (!blob) {
      throw new Error('签名生成失败，请重试')
    }
    if (typeof File === 'function') {
      return new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' })
    }
    return blob
  }

  throw new Error('请先完成手写签名')
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
