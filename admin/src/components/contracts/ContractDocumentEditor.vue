<template>
  <div class="contract-doc">
    <div class="contract-header">
      <div class="contract-number">
        合同编号：
        <input
          v-if="editable"
          v-model="contract.contractNo"
          class="contract-input"
          style="width: 280px"
        />
        <span v-else>{{ contract.contractNo }}</span>
      </div>
      <h2 class="contract-title">采 购 合 同</h2>
    </div>

    <div class="contract-parties">
      <div class="party-title">甲方信息</div>
      <div class="party-row"><span class="party-label">采购方（甲方）：</span><FieldText v-model="contract.buyerInfo.name" :editable="editable" width="320px" /></div>
      <div class="party-row"><span class="party-label">法定代表人：</span><FieldText v-model="contract.buyerInfo.legal_person" :editable="editable" width="180px" /></div>
      <div class="party-row"><span class="party-label">统一社会信用代码：</span><FieldText v-model="contract.buyerInfo.credit_code" :editable="editable" width="280px" /></div>
      <div class="party-row"><span class="party-label">地址：</span><FieldText v-model="contract.buyerInfo.address" :editable="editable" width="420px" /></div>
      <div class="party-row"><span class="party-label">联系方式：</span><FieldText v-model="contract.buyerInfo.phone" :editable="editable" width="220px" /></div>

      <div style="height: 12px" />
      <div class="party-title">乙方信息</div>
      <div class="party-row"><span class="party-label">供货方（乙方）：</span><FieldText v-model="contract.supplierName" :editable="editable" width="320px" /></div>
      <div class="party-row"><span class="party-label">法定代表人：</span><FieldText v-model="contract.legalPerson" :editable="editable" width="180px" /></div>
      <div class="party-row"><span class="party-label">统一社会信用代码：</span><FieldText v-model="contract.creditCode" :editable="editable" width="280px" /></div>
      <div class="party-row"><span class="party-label">地址：</span><FieldText v-model="contract.address" :editable="editable" width="420px" /></div>
      <div class="party-row"><span class="party-label">联系方式：</span><FieldText v-model="contract.phone" :editable="editable" width="220px" /></div>
    </div>

    <div class="contract-section">
      <h3>前言</h3>
      <el-input
        v-if="editable"
        v-model="contract.clauseSections.preamble"
        type="textarea"
        :rows="4"
      />
      <p v-else class="contract-text">{{ contract.clauseSections.preamble }}</p>
    </div>

    <div class="contract-section">
      <h3>一、采购货物说明：<FieldText v-model="contract.productDesc" :editable="editable" width="220px" /></h3>
      <p class="sub-title">1. 采购结算主表</p>
      <table class="contract-table">
        <thead>
          <tr>
            <th>产品型号</th>
            <th>采购数量</th>
            <th>采购单价（含税）</th>
            <th>采购金额（含税）</th>
            <th v-if="editable && allowRowDelete">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in contract.productItems" :key="item.row_id">
            <td><FieldText v-model="item.model" :editable="editable" width="120px" :placeholder="isFeeItem(item) ? '费用名称' : '型号'" /></td>
            <td class="qty-cell">
              <template v-if="isFeeItem(item)">
                <span class="qty-text">一次性费用</span>
              </template>
              <template v-else>
                <el-input-number
                  v-if="editable"
                  v-model="item.total_qty"
                  :min="0"
                  :step="100"
                  controls-position="right"
                  style="width: 130px"
                />
                <span v-else class="qty-text">{{ formatQuantity(item.total_qty) }}</span>
              </template>
            </td>
            <td>
              <el-input-number
                v-if="editable"
                v-model="item.unit_price"
                :min="0"
                :precision="2"
                :step="0.5"
                controls-position="right"
                style="width: 120px"
              />
              <span v-else>{{ formatUnitPrice(item.unit_price) }}</span>
            </td>
            <td style="font-weight: 600">{{ formatAmount(calcProductItemAmount(item)) }}</td>
            <td v-if="editable && allowRowDelete" style="text-align: center">
              <el-button text type="danger" @click="handleDeleteRow(item.row_id)">删除</el-button>
            </td>
          </tr>
          <tr class="total-row">
            <td :colspan="editable && allowRowDelete ? 4 : 3" style="text-align: right; font-weight: 600">合计采购总金额（含税）</td>
            <td style="font-weight: 700; color: var(--color-danger)">{{ formatAmount(calcContractGrandTotal(contract)) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="editable" class="settlement-actions">
        <el-button text type="primary" size="small" @click="handleAddFeeRow">+ 增加一次性费用</el-button>
      </div>

      <p class="sub-title">2. 规格说明表</p>
      <table class="contract-table">
        <thead>
          <tr>
            <th>产品型号</th>
            <th>规格或尺寸</th>
            <th>材质</th>
            <th>重量</th>
            <th>颜色</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in getDeliverableProductItems(contract.productItems)" :key="`${item.row_id}_spec`">
            <td><FieldText v-model="item.model" :editable="editable" width="120px" placeholder="型号" /></td>
            <td><FieldText v-model="item.size" :editable="editable" width="160px" placeholder="尺寸/标准" /></td>
            <td><FieldText v-model="item.material" :editable="editable" width="100px" placeholder="材质" /></td>
            <td><FieldText v-model="item.weight" :editable="editable" width="90px" placeholder="重量" /></td>
            <td><FieldText v-model="item.color" :editable="editable" width="90px" placeholder="颜色" /></td>
          </tr>
        </tbody>
      </table>

      <p class="sub-title">3. 成品货物要求</p>
      <el-input v-if="editable" v-model="contract.clauseSections.quality_clause" type="textarea" :rows="4" />
      <p v-else class="contract-text">{{ contract.clauseSections.quality_clause }}</p>

      <p class="sub-title">4. 乙方负责本合同产品生产的原材料有</p>
      <el-input v-if="editable" v-model="contract.rawMaterials" type="textarea" :rows="2" />
      <p v-else class="contract-text">{{ contract.rawMaterials || '—' }}</p>

      <p class="sub-title">5. 生产过程调整说明</p>
      <el-input v-if="editable" v-model="contract.clauseSections.variation_clause" type="textarea" :rows="3" />
      <p v-else class="contract-text">{{ contract.clauseSections.variation_clause }}</p>
    </div>

    <div class="contract-section">
      <h3>二、产品采购下单方式及产品交付时间</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.delivery_clause" type="textarea" :rows="3" />
      <p v-else class="contract-text">{{ contract.clauseSections.delivery_clause }}</p>

      <table class="contract-table delivery-table">
        <thead>
          <tr>
            <th style="width: 140px">交付提货时间</th>
            <th v-for="item in getDeliverableProductItems(contract.productItems)" :key="item.row_id">{{ item.model || item.part_name || '配件' }}</th>
            <th style="width: 80px">总数量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in contract.deliveryRows" :key="row.row_id">
            <td>
              <el-date-picker
                v-if="editable"
                v-model="row.date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                size="small"
                style="width: 140px"
              />
              <span v-else>{{ row.date || '-' }}</span>
            </td>
            <td v-for="item in getDeliverableProductItems(contract.productItems)" :key="item.row_id">
              <el-input-number
                v-if="editable"
                v-model="row.qtys[item.row_id]"
                :min="0"
                :step="100"
                controls-position="right"
                size="small"
                style="width: 88px"
              />
              <span v-else>{{ row.qtys?.[item.row_id] || 0 }}</span>
            </td>
            <td style="font-weight: 600; text-align: center">{{ calcDeliveryRowTotal(row) }}</td>
          </tr>
          <tr class="total-row">
            <td style="font-weight: 600; text-align: center">总数</td>
            <td v-for="item in getDeliverableProductItems(contract.productItems)" :key="item.row_id" style="font-weight: 600; text-align: center">{{ calcDeliveryColTotal(contract, item.row_id) }}</td>
            <td style="font-weight: 700; text-align: center">{{ calcDeliveryGrandTotal(contract) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="editable" style="margin-top: 8px">
        <el-button text type="primary" size="small" @click="handleAddDeliveryRow">+ 增加一行</el-button>
        <el-button text type="danger" size="small" :disabled="contract.deliveryRows.length <= 1" @click="handleDeleteDeliveryRow">- 删除最后一行</el-button>
      </div>
    </div>

    <div class="contract-section" v-if="(contract.appendixImages || []).length > 0">
      <h3>附录一：产品规格和尺寸说明</h3>
      <div class="appendix-grid">
        <figure v-for="image in contract.appendixImages" :key="image.file_id || image.url || image.name" class="appendix-item">
          <img v-if="image.url" :src="image.url" :alt="image.name || '附录图片'" />
          <div v-else class="appendix-placeholder">{{ image.name || '附录图片' }}</div>
          <figcaption>{{ image.note || image.name || '规格图纸' }}</figcaption>
        </figure>
      </div>
    </div>

    <div class="contract-section">
      <h3>三、产品合格率与产品返工要求</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.quality_guarantee_clause" type="textarea" :rows="4" />
      <p v-else class="contract-text">{{ contract.clauseSections.quality_guarantee_clause }}</p>
    </div>

    <div class="contract-section">
      <h3>四、支付方式</h3>
      <div class="payment-grid">
        <div><span class="party-label">订金比例：</span><FieldText v-model="contract.clauseSections.payment_ratio_deposit" :editable="editable" width="80px" /></div>
        <div><span class="party-label">尾款比例：</span><FieldText v-model="contract.clauseSections.payment_ratio_final" :editable="editable" width="80px" /></div>
        <div><span class="party-label">户名：</span><FieldText v-model="contract.bankName" :editable="editable" width="220px" /></div>
        <div><span class="party-label">账户号：</span><FieldText v-model="contract.bankAccount" :editable="editable" width="220px" /></div>
        <div><span class="party-label">开户行：</span><FieldText v-model="contract.bankBranch" :editable="editable" width="260px" /></div>
      </div>
      <el-input v-if="editable" v-model="contract.clauseSections.payment_clause" type="textarea" :rows="6" />
      <div v-else class="contract-text-block">
        <p v-for="line in splitLines(contract.clauseSections.payment_clause)" :key="line" class="contract-text">{{ line }}</p>
      </div>
    </div>

    <div class="contract-section">
      <h3>五、增值税专用发票开票信息</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.invoice_clause" type="textarea" :rows="5" />
      <div v-else class="contract-text-block">
        <p v-for="line in splitLines(contract.clauseSections.invoice_clause)" :key="line" class="contract-text">{{ line }}</p>
      </div>
    </div>

    <div class="contract-section">
      <h3>六、甲方的权利与责任</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.section6_text" type="textarea" :rows="4" />
      <div v-else class="contract-text-block">
        <p v-for="line in splitLines(contract.clauseSections.section6_text)" :key="line" class="contract-text">{{ line }}</p>
      </div>
    </div>

    <div class="contract-section">
      <h3>七、乙方的权利与责任</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.section7_text" type="textarea" :rows="5" />
      <div v-else class="contract-text-block">
        <p v-for="line in splitLines(contract.clauseSections.section7_text)" :key="line" class="contract-text">{{ line }}</p>
      </div>
    </div>

    <div class="contract-section">
      <h3>八、法律适用与争议的解决</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.section8_text" type="textarea" :rows="4" />
      <div v-else class="contract-text-block">
        <p v-for="line in splitLines(contract.clauseSections.section8_text)" :key="line" class="contract-text">{{ line }}</p>
      </div>
    </div>

    <div class="contract-section">
      <h3>九、合同生效、变更及终止</h3>
      <el-input v-if="editable" v-model="contract.clauseSections.section9_text" type="textarea" :rows="4" />
      <div v-else class="contract-text-block">
        <p v-for="line in splitLines(contract.clauseSections.section9_text)" :key="line" class="contract-text">{{ line }}</p>
      </div>
    </div>

    <div class="contract-sign">
      <div class="sign-col"><p><strong>甲方（盖章）：</strong></p><p style="margin-top: 48px">日期：</p></div>
      <div class="sign-col"><p><strong>乙方（盖章）：</strong></p><p style="margin-top: 48px">日期：</p></div>
    </div>
    <div style="text-align: center; margin-top: 16px; font-size: 12px; color: var(--color-text-muted)">{{ contract.buyerInfo.name }}</div>
  </div>
</template>

<script setup>
import { defineComponent, h, watch } from 'vue'
import {
  calcContractGrandTotal,
  calcDeliveryColTotal,
  calcDeliveryGrandTotal,
  calcDeliveryRowTotal,
  calcProductItemAmount,
  createEmptyFeeItem,
  createEmptyDeliveryRow,
  ensureContractShape,
  getDeliverableProductItems,
  isFeeItem,
  removeProductItem
} from '../../utils/contractDocument'

const props = defineProps({
  contract: {
    type: Object,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  },
  allowRowDelete: {
    type: Boolean,
    default: false
  }
})

const FieldText = defineComponent({
  name: 'FieldText',
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    editable: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    width: {
      type: String,
      default: '200px'
    }
  },
  emits: ['update:modelValue'],
  setup(fieldProps, { emit }) {
    return () => {
      if (fieldProps.editable) {
        return h('input', {
          value: fieldProps.modelValue,
          placeholder: fieldProps.placeholder,
          class: 'contract-input',
          style: { width: fieldProps.width },
          onInput: (event) => emit('update:modelValue', event.target.value)
        })
      }

      return h('span', fieldProps.modelValue || '-')
    }
  }
})

watch(
  () => props.contract,
  (contract) => {
    if (contract) {
      ensureContractShape(contract)
    }
  },
  { immediate: true }
)

function handleDeleteRow(rowId) {
  removeProductItem(props.contract, rowId)
}

function handleAddDeliveryRow() {
  props.contract.deliveryRows.push(createEmptyDeliveryRow(props.contract.productItems))
}

function handleAddFeeRow() {
  props.contract.productItems.push(createEmptyFeeItem())
}

function handleDeleteDeliveryRow() {
  if (props.contract.deliveryRows.length > 1) {
    props.contract.deliveryRows.pop()
  }
}

function formatUnitPrice(value) {
  if (value === '' || value === null || value === undefined) {
    return '-'
  }
  return `¥ ${Number(value).toFixed(2)}`
}

function formatAmount(value) {
  const number = Number(value || 0)
  return `${number.toLocaleString()} 元`
}

function formatQuantity(value) {
  const number = Number(value || 0)
  return number.toLocaleString()
}

function splitLines(text) {
  return String(text || '').split('\n').filter(Boolean)
}
</script>

<style scoped>
.contract-doc {
  max-width: 980px;
  margin: 0 auto;
  background: #fff;
  padding: 48px 56px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  font-family: 'SimSun', 'Songti SC', serif;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}

.contract-header {
  text-align: center;
  margin-bottom: 24px;
}

.contract-number {
  text-align: right;
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.contract-title {
  font-size: 22px;
  letter-spacing: 8px;
  font-weight: 700;
}

.contract-parties {
  margin-bottom: 20px;
}

.party-title {
  margin: 12px 0 6px;
  font-weight: 700;
}

.party-row {
  margin-bottom: 4px;
}

.party-label {
  color: #666;
}

.contract-section {
  margin-top: 18px;
}

.contract-section h3 {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.sub-title {
  margin: 12px 0 4px;
  font-weight: 700;
}

.qty-cell {
  min-width: 220px;
  text-align: left !important;
}

.qty-text {
  display: block;
  white-space: pre-line;
}

.qty-total {
  margin-top: 6px;
  font-size: 12px;
  color: #6B7280;
}

.settlement-actions {
  margin-top: -4px;
  margin-bottom: 8px;
}

.contract-text {
  margin: 0 0 8px;
  text-align: justify;
  white-space: pre-wrap;
}

.contract-text-block {
  padding: 6px 0;
}

.contract-input {
  border: none;
  border-bottom: 1px solid #1A56DB;
  background: #EFF6FF;
  padding: 2px 8px;
  font-size: 14px;
  font-family: inherit;
  color: #1A56DB;
  outline: none;
  border-radius: 0;
}

.contract-input:focus {
  border-bottom-color: #DC2626;
  background: #FEF2F2;
}

.contract-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

.contract-table th,
.contract-table td {
  border: 1px solid #999;
  padding: 8px;
  text-align: center;
  vertical-align: top;
}

.contract-table th {
  background: #F3F4F6;
  font-weight: 600;
}

.total-row td {
  background: #FFFBEB;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin-bottom: 12px;
}

.contract-sign {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  padding-top: 24px;
}

.appendix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.appendix-item {
  margin: 0;
  border: 1px solid #d1d5db;
  padding: 8px;
}

.appendix-item img {
  display: block;
  width: 100%;
  max-height: 360px;
  object-fit: contain;
}

.appendix-placeholder {
  padding: 32px 12px;
  background: #f9fafb;
  color: #6b7280;
  text-align: center;
}

.appendix-item figcaption {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.sign-col {
  width: 45%;
}
</style>
