import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildContractUpdatePayload,
  calcContractGrandTotal,
  createEmptyFeeItem,
  validateDeliveryTotals
} from '../src/utils/contractDocument.js'
import { buildContractWord } from '../src/utils/contractWord.js'
import { getEmptyInventoryForm } from '../src/utils/inventoryForm.js'

function baseContractDraft() {
  return {
    contractNo: 'DX-TEST-001',
    supplierName: '义乌乐卡工艺品有限公司',
    legalPerson: '',
    creditCode: '',
    address: '',
    phone: '',
    bankName: '义乌乐卡工艺品有限公司',
    bankAccount: '201000309022290',
    bankBranch: '义乌农商银行赤岸支行',
    buyerInfo: {},
    productDesc: '垫子',
    rawMaterials: '',
    productItems: [
      {
        item_type: 'product',
        row_id: 'pi_1',
        part_type_id: 'pt_1',
        part_name: '03M-灰色',
        model: '03M-灰色',
        total_qty: 10,
        unit_price: 2,
        source_item_ids: ['ci_1']
      }
    ],
    deliveryRows: [{ row_id: 'dr_1', date: '2026-05-01', qtys: { pi_1: 10 } }],
    clauseSections: {
      payment_ratio_deposit: 30,
      payment_ratio_final: 70,
      payment_clause: '甲方承诺在合同签署后，货物生产前将货物采购订金支付至乙方指定银行账户。\n\n乙方指定的收款账户信息如下：\n户名：旧开户银行\n账户号：201000309022290\n开户行：旧全称'
    },
    appendixImages: [],
    _items: [{ item_id: 'ci_1', quantity: 10, unit_price: 2 }]
  }
}

test('contract payload uses total quantity and refreshes generated payment account name', () => {
  const payload = buildContractUpdatePayload(baseContractDraft())

  assert.equal(payload.product_items[0].qty_detail, '')
  assert.equal(payload.product_items[0].total_qty, 10)
  assert.equal(payload.supplier_bank_account_name, '义乌乐卡工艺品有限公司')
  assert.equal(payload.supplier_bank_name, '义乌农商银行赤岸支行')
  assert.match(payload.clause_sections.payment_clause, /户名：义乌乐卡工艺品有限公司/)
})

test('fee rows contribute to amount and are ignored by delivery validation', () => {
  const draft = baseContractDraft()
  const fee = createEmptyFeeItem()
  fee.model = '首次模具费'
  fee.unit_price = 500
  draft.productItems.push(fee)

  assert.equal(calcContractGrandTotal(draft), 520)
  assert.doesNotThrow(() => validateDeliveryTotals(draft))
})

test('delivery mismatch blocks contract actions', () => {
  const draft = baseContractDraft()
  draft.deliveryRows[0].qtys.pi_1 = 9
  assert.throws(() => buildContractUpdatePayload(draft), /交付计划数量必须与采购数量一致/)
})

test('word generation accepts fee and appendix rows without throwing', () => {
  const draft = baseContractDraft()
  draft.productItems.push({ ...createEmptyFeeItem(), model: '首次模具费', unit_price: 500 })
  draft.appendixImages = [{ name: '图纸', file_id: 'cloud://demo/appendix.png' }]

  const doc = buildContractWord(draft)
  assert.ok(doc)
})

test('inventory create form defaults to finished product inventory', () => {
  const form = getEmptyInventoryForm()
  assert.equal(form.itemType, 'product')
  assert.equal(form.wipQty, 0)
  assert.equal(form.semiQty, 0)
  assert.equal(form.finishedQty, 0)
})
