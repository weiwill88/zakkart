const assert = require('node:assert/strict')
const test = require('node:test')
const Module = require('node:module')

const {
  createClauseSections,
  ensureContractDocument,
  validateDeliveryTotals
} = require('../utils/contract-document')

function loadWithMocks(modulePath, mocks) {
  const originalLoad = Module._load
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request]
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  const resolved = require.resolve(modulePath)
  delete require.cache[resolved]
  try {
    return require(modulePath)
  } finally {
    Module._load = originalLoad
  }
}

test('contract payment clause uses supplier company as account name', () => {
  const sections = createClauseSections({
    supplierAccountName: '义乌乐卡工艺品有限公司',
    supplierBankName: '义乌农商银行赤岸支行',
    supplierBankAccount: '201000309022290',
    supplierBankBranch: '浙江义乌农村商业银行股份有限公司赤岸支行'
  })

  assert.equal(sections.payment_account_name, '义乌乐卡工艺品有限公司')
  assert.equal(sections.payment_bank_name, '义乌农商银行赤岸支行')
  assert.match(sections.payment_clause, /户名：义乌乐卡工艺品有限公司/)
  assert.match(sections.payment_clause, /开户行：义乌农商银行赤岸支行/)
})

test('delivery total validation ignores fee rows and catches mismatches', () => {
  const contract = ensureContractDocument({
    supplier_name: '测试供应商',
    product_items: [
      { row_id: 'pi_1', item_type: 'product', model: '03M-灰色', total_qty: 10, unit_price: 1 },
      { row_id: 'fee_1', item_type: 'fee', model: '模具费', total_qty: 1, unit_price: 500 }
    ],
    delivery_rows: [{ row_id: 'dr_1', date: '2026-05-01', qtys: { pi_1: 10 } }]
  })

  assert.doesNotThrow(() => validateDeliveryTotals(contract))
  assert.throws(() => validateDeliveryTotals({
    ...contract,
    delivery_rows: [{ row_id: 'dr_1', date: '2026-05-01', qtys: { pi_1: 9 } }]
  }), /交付计划数量必须与采购数量一致/)
})

test('part type uniqueness fingerprint includes material color and size', () => {
  const partTypeRoutes = loadWithMocks('../routes/partType', {
    '../config/database': {
      getCollection: () => { throw new Error('not used') },
      command: {},
      createKeywordRegExp: () => null
    }
  })
  const { buildPartTypeFingerprint } = partTypeRoutes.__test

  const base = {
    category: '铁架套装',
    name: '03铁棒-M-白色',
    supplier_org_id: 'org_001',
    material: '16MM铁管',
    color: '白色',
    size: '50厘米'
  }

  assert.equal(buildPartTypeFingerprint(base), buildPartTypeFingerprint({ ...base }))
  assert.notEqual(buildPartTypeFingerprint(base), buildPartTypeFingerprint({ ...base, size: '57厘米' }))
})

test('h5 ensureDriverObject only normalizes in memory and avoids empty database update', async () => {
  let updateCalled = false
  const h5Routes = loadWithMocks('../routes/h5', {
    '../config/database': {
      getCollection: () => ({
        doc: () => ({
          update: async () => {
            updateCalled = true
          }
        })
      })
    },
    '../utils/shipment': {
      resolveShipmentTarget: async () => null,
      updateTargetStatus: async () => {},
      safeCreateNotification: async () => {},
      buildShipmentSummary: shipment => shipment
    }
  })

  const shipment = { _id: 'shipment_001', driver: null }
  await h5Routes.__test.ensureDriverObject(shipment)
  assert.deepEqual(shipment.driver, {})
  assert.equal(updateCalled, false)
})

test('sms login sends real code through provider and verifies stored hash', async () => {
  const restoreEnv = withEnv({
    SMS_SECRET_ID: 'test-secret-id',
    SMS_SECRET_KEY: 'test-secret-key',
    SMS_SDK_APP_ID: '1400000000',
    SMS_SIGN_NAME: '测试签名',
    SMS_TEMPLATE_ID: '123456',
    SMS_MOCK: '',
    JWT_SECRET: 'test-jwt-secret'
  })
  const user = {
    _id: 'user_001',
    phone: '13900000000',
    name: '测试用户',
    role: 'admin',
    org_id: 'org_platform',
    permissions: []
  }
  const updates = []
  let sentCode = ''

  try {
    const authRoutes = loadWithMocks('../routes/auth', {
      '../config/database': {
        getCollection: () => ({
          where: (query) => ({
            limit: () => ({
              get: async () => ({ data: query.phone === user.phone ? [user] : [] })
            })
          }),
          doc: () => ({
            get: async () => ({ data: user }),
            update: async ({ data }) => {
              updates.push(data)
              Object.assign(user, data)
            }
          })
        })
      },
      '../utils/tencent-sms': {
        isSmsConfigured: () => true,
        sendTencentSms: async ({ code }) => {
          sentCode = code
          return { requestId: 'req_001' }
        }
      }
    })

    const sendResult = await authRoutes['auth.smsSend']({ params: { mobile: user.phone } })
    assert.equal(sendResult.sent, true)
    assert.equal(sendResult.mock, false)
    assert.equal(sendResult.mock_code, undefined)
    assert.match(sentCode, /^\d{6}$/)
    assert.equal(typeof user.sms_verification?.code_hash, 'string')

    const loginResult = await authRoutes['auth.smsLogin']({ params: { mobile: user.phone, code: sentCode } })
    assert.equal(loginResult.user.phone, user.phone)
    assert.equal(typeof loginResult.token, 'string')
    assert.equal(user.sms_verification, null)
    assert.ok(updates.some((item) => item.last_login_at && item.sms_verification === null))
  } finally {
    restoreEnv()
  }
})

test('tencent sms template params support explicit and fallback modes', () => {
  const { __test } = require('../utils/tencent-sms')
  const restoreEnv = withEnv({
    SMS_TEMPLATE_PARAMS: '',
    SMS_TEMPLATE_PARAM_MODE: ''
  })

  try {
    assert.deepEqual(__test.getTemplateParamCandidates('123456', 5), [
      ['123456'],
      ['123456', '5']
    ])
  } finally {
    restoreEnv()
  }

  const restoreExplicitEnv = withEnv({
    SMS_TEMPLATE_PARAMS: '{code},{expireMinutes},Zakkart',
    SMS_TEMPLATE_PARAM_MODE: ''
  })
  try {
    assert.deepEqual(__test.getTemplateParamCandidates('654321', 10), [
      ['654321', '10', 'Zakkart']
    ])
  } finally {
    restoreExplicitEnv()
  }
})

function withEnv(values) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    process.env[key] = value
  }

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}
