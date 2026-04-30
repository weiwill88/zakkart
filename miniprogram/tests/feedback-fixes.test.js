const assert = require('node:assert/strict')
const test = require('node:test')
const { mapCooperationStatus } = require('../utils/supplier-display')
const { normalizeAddressOptions, resolveDestinationType } = require('../utils/shipping-form')
const { validateOutboundForm } = require('../utils/outbound-form')

test('supplier list maps stopped cooperation status to stopped badge', () => {
  assert.deepEqual(mapCooperationStatus('stopped'), {
    status: 'stopped',
    statusText: '已停止',
    statusClass: 'badge-abnormal'
  })
  assert.equal(mapCooperationStatus('active').statusText, '合作中')
})

test('shipping form normalizes address ids without exposing _id in templates', () => {
  const list = normalizeAddressOptions([
    { _id: 'addr_001', label: '发货地址' },
    { id: 'addr_002', detail: '目的地地址' },
    { label: '无 id 地址' }
  ])

  assert.equal(list.length, 2)
  assert.equal(list[0].id, 'addr_001')
  assert.equal(list[1].label, '目的地地址')
})

test('shipping destination uses selected candidate rule before org default', () => {
  assert.equal(resolveDestinationType([{ selected: true, destinationType: 'freight' }], { has_assembly: false }), 'freight')
  assert.equal(resolveDestinationType([], { has_assembly: true }), 'freight')
  assert.equal(resolveDestinationType([], { has_assembly: false }), 'assembly')
})

test('outbound form validates editable quantity and destination fields', () => {
  assert.equal(validateOutboundForm({ selectedSku: '', outboundQty: 1, destination: '货代仓' }), '请选择成品 SKU')
  assert.equal(validateOutboundForm({ selectedSku: '03M', outboundQty: '', destination: '货代仓' }), '请输入出库数量')
  assert.equal(validateOutboundForm({ selectedSku: '03M', outboundQty: 10, destination: '' }), '请输入目的地')
  assert.equal(validateOutboundForm({ selectedSku: '03M', outboundQty: 10, destination: '货代仓' }), '')
})
