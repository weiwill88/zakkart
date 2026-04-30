const crypto = require('crypto')
const https = require('https')

const SMS_ENDPOINT = 'sms.tencentcloudapi.com'
const SMS_SERVICE = 'sms'
const SMS_ACTION = 'SendSms'
const SMS_VERSION = '2021-01-11'
const DEFAULT_REGION = 'ap-guangzhou'

async function sendTencentSms({ mobile, code, expireMinutes = 5 }) {
  const config = getSmsConfig()
  const phoneNumber = normalizePhoneNumber(mobile)
  const paramCandidates = getTemplateParamCandidates(code, expireMinutes)
  let lastError = null

  for (const templateParams of paramCandidates) {
    try {
      return await sendSmsRequest({
        ...config,
        phoneNumber,
        templateParams
      })
    } catch (error) {
      lastError = error
      if (!isTemplateParamError(error) || paramCandidates.length === 1) {
        throw error
      }
    }
  }

  throw lastError
}

function isSmsConfigured() {
  return Boolean(
    process.env.SMS_SECRET_ID &&
    process.env.SMS_SECRET_KEY &&
    process.env.SMS_SDK_APP_ID &&
    process.env.SMS_SIGN_NAME &&
    process.env.SMS_TEMPLATE_ID
  )
}

function getSmsConfig() {
  const required = [
    'SMS_SECRET_ID',
    'SMS_SECRET_KEY',
    'SMS_SDK_APP_ID',
    'SMS_SIGN_NAME',
    'SMS_TEMPLATE_ID'
  ]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    const error = new Error(`短信服务未配置完整：${missing.join(', ')}`)
    error.code = 500
    throw error
  }

  return {
    secretId: process.env.SMS_SECRET_ID,
    secretKey: process.env.SMS_SECRET_KEY,
    smsSdkAppId: process.env.SMS_SDK_APP_ID,
    signName: process.env.SMS_SIGN_NAME,
    templateId: process.env.SMS_TEMPLATE_ID,
    region: process.env.SMS_REGION || DEFAULT_REGION
  }
}

function normalizePhoneNumber(mobile) {
  const value = String(mobile || '').trim()
  if (value.startsWith('+')) {
    return value
  }
  return `+86${value}`
}

function getTemplateParamCandidates(code, expireMinutes) {
  const explicitParams = String(process.env.SMS_TEMPLATE_PARAMS || '').trim()
  if (explicitParams) {
    return [
      explicitParams.split(',').map((item) => interpolateParam(item.trim(), code, expireMinutes))
    ]
  }

  const mode = String(process.env.SMS_TEMPLATE_PARAM_MODE || '').trim()
  if (mode === 'code_only' || mode === '1') {
    return [[code]]
  }
  if (mode === 'code_expire' || mode === '2') {
    return [[code, String(expireMinutes)]]
  }

  return [
    [code],
    [code, String(expireMinutes)]
  ]
}

function interpolateParam(value, code, expireMinutes) {
  return value
    .replace(/\{code\}/g, code)
    .replace(/\{expireMinutes\}/g, String(expireMinutes))
}

function sendSmsRequest({
  secretId,
  secretKey,
  smsSdkAppId,
  signName,
  templateId,
  region,
  phoneNumber,
  templateParams
}) {
  const payload = JSON.stringify({
    PhoneNumberSet: [phoneNumber],
    SmsSdkAppId: smsSdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: templateParams
  })
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const authorization = createAuthorization({
    secretId,
    secretKey,
    timestamp,
    date,
    payload
  })

  const headers = {
    Authorization: authorization,
    'Content-Type': 'application/json; charset=utf-8',
    Host: SMS_ENDPOINT,
    'X-TC-Action': SMS_ACTION,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': SMS_VERSION,
    'X-TC-Region': region,
    'X-TC-Language': 'zh-CN'
  }

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SMS_ENDPOINT,
      method: 'POST',
      path: '/',
      headers,
      timeout: 10000
    }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        try {
          const body = raw ? JSON.parse(raw) : {}
          const response = body.Response || {}
          if (response.Error) {
            reject(createSmsError(response.Error.Code, response.Error.Message, response.RequestId))
            return
          }

          const status = Array.isArray(response.SendStatusSet) ? response.SendStatusSet[0] : null
          if (!status || status.Code !== 'Ok') {
            reject(createSmsError(status?.Code || 'UNKNOWN', status?.Message || '短信发送失败', response.RequestId))
            return
          }

          resolve({
            requestId: response.RequestId,
            serialNo: status.SerialNo || '',
            fee: status.Fee || 0
          })
        } catch (error) {
          const parseError = new Error('短信服务响应解析失败')
          parseError.code = 502
          parseError.details = { statusCode: res.statusCode }
          reject(parseError)
        }
      })
    })

    req.on('timeout', () => {
      req.destroy(createSmsError('REQUEST_TIMEOUT', '短信服务请求超时'))
    })
    req.on('error', (error) => {
      if (!error.code || typeof error.code === 'string') {
        error.code = 502
      }
      reject(error)
    })
    req.write(payload)
    req.end()
  })
}

function createAuthorization({ secretId, secretKey, timestamp, date, payload }) {
  const algorithm = 'TC3-HMAC-SHA256'
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${SMS_ENDPOINT}\n`
  const signedHeaders = 'content-type;host'
  const hashedRequestPayload = sha256(payload)
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n')
  const credentialScope = `${date}/${SMS_SERVICE}/tc3_request`
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n')
  const signingKey = getSignatureKey(secretKey, date, SMS_SERVICE)
  const signature = hmac(signingKey, stringToSign, 'hex')

  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

function getSignatureKey(secretKey, date, service) {
  const secretDate = hmac(`TC3${secretKey}`, date)
  const secretService = hmac(secretDate, service)
  return hmac(secretService, 'tc3_request')
}

function sha256(message) {
  return crypto.createHash('sha256').update(message, 'utf8').digest('hex')
}

function hmac(key, message, encoding) {
  return crypto.createHmac('sha256', key).update(message, 'utf8').digest(encoding)
}

function createSmsError(code, message, requestId = '') {
  const error = new Error(message || '短信发送失败')
  error.code = 502
  error.smsCode = code || 'UNKNOWN'
  error.details = requestId ? { request_id: requestId, sms_code: error.smsCode } : { sms_code: error.smsCode }
  return error
}

function isTemplateParamError(error) {
  const code = String(error.smsCode || '')
  return /Template|Param/i.test(code)
}

module.exports = {
  sendTencentSms,
  isSmsConfigured,
  __test: {
    createAuthorization,
    getTemplateParamCandidates,
    normalizePhoneNumber
  }
}
