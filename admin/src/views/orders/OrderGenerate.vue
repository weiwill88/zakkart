<template>
  <div>
    <!-- Step 1: 选择父 ASIN + 子 ASIN 分配 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">第一步：选择产品并分配数量</span>
          <el-tag type="info">以 Listing（父 ASIN）为单位下单</el-tag>
        </div>
      </template>

      <el-form label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="选择产品 Listing（父 ASIN）">
              <el-select v-model="selectedProductId" placeholder="选择产品" filterable style="width: 100%" @change="onProductChange">
                <el-option v-for="p in products" :key="p._id" :label="`${p.code} · ${p.name_cn} (${p.parent_asin || ''})`" :value="p._id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="采购总数量">
              <el-input-number v-model="totalQty" :min="1" :step="100" style="width: 100%" @change="recalcLastSku" :disabled="!selectedProduct" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label=" ">
              <el-button type="primary" @click="generateOrder" :disabled="!selectedProduct || normalizedTotalQty < 1" style="width: 100%">
                生成订单 & 合同
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 子 ASIN 勾选与数量分配 -->
      <div v-if="selectedProduct" style="margin-top: 8px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <span style="font-weight: 600; color: var(--color-text-secondary)">
            子 ASIN 列表（共 {{ selectedProduct.skus.length }} 个，已选 {{ checkedSkus.length }} 个）
          </span>
          <div>
            <el-button text size="small" @click="selectAll">全选</el-button>
            <el-button text size="small" @click="deselectAll">取消全选</el-button>
            <el-tag style="margin-left: 8px">
              已分配：{{ allocatedTotal }} / {{ normalizedTotalQty || '-' }}
              <span v-if="!normalizedTotalQty" style="color: var(--color-text-muted)"> · 请先填写采购总数量</span>
              <span v-else-if="remainQty > 0" style="color: var(--color-warning)"> · 剩余 {{ remainQty }}</span>
              <span v-else-if="remainQty === 0" style="color: var(--color-success)"> ✓ 已分配完</span>
              <span v-else style="color: var(--color-danger)"> 超出 {{ -remainQty }}</span>
            </el-tag>
          </div>
        </div>

        <el-table :data="skuRows" border size="small" style="width: 100%">
          <el-table-column width="50" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.checked" @change="onSkuCheckChange(row)" />
            </template>
          </el-table-column>
          <el-table-column prop="sku_id" label="SKU 编号" width="160">
            <template #default="{ row }">
              <span :style="{ fontWeight: 600, opacity: row.checked ? 1 : 0.4 }">{{ row.sku_id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="子 ASIN" width="150">
            <template #default="{ row }">
              <code style="font-size: 11px; background: #F3F4F6; padding: 2px 6px; border-radius: 3px">{{ row.child_asin || '-' }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="spec" label="规格" min-width="180" />
          <el-table-column label="BOM 配件数" width="100" align="center">
            <template #default="{ row }">{{ (row.bom_items || []).length }} 种</template>
          </el-table-column>
          <el-table-column label="分配数量" width="200" align="center">
            <template #default="{ row, $index }">
              <template v-if="row.checked">
                <template v-if="isLastChecked($index)">
                  <el-tag type="success" size="small" style="font-size: 14px; font-weight: 700">{{ row.qty }}（自动计算）</el-tag>
                </template>
                <template v-else>
                  <el-input-number v-model="row.qty" :min="0" :max="totalQty" size="small" style="width: 150px" @change="recalcLastSku" />
                </template>
              </template>
              <span v-else style="color: var(--color-text-muted)">—</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- Step 2: 合同预览（按供应商分组） -->
    <template v-if="contracts.length > 0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <span style="font-size: 18px; font-weight: 600">合同预览（共 {{ contracts.length }} 份）</span>
        <div>
          <el-button type="success" :loading="savingAll" @click="saveAllContracts">保存全部草稿</el-button>
          <el-button type="warning" :loading="pushingAll" @click="pushAllContracts">一键推送确认</el-button>
          <el-button type="primary" @click="exportAllContracts">一键导出全部 Word</el-button>
        </div>
      </div>

      <el-tabs v-model="activeContract" type="card">
        <el-tab-pane v-for="(c, ci) in contracts" :key="ci" :label="c.supplierName.length > 4 ? c.supplierName.slice(0, 4) + '…' : c.supplierName" :name="String(ci)">
          <div class="contract-state-bar">
            <div class="contract-state-left">
              <el-tag :type="statusTagType(c._status)">{{ statusLabel(c._status) }}</el-tag>
              <el-tag :type="supplierConfirmTagType(c._supplierConfirmStatus)">{{ supplierConfirmLabel(c._supplierConfirmStatus) }}</el-tag>
            </div>
            <div class="contract-state-actions">
              <el-button size="small" :loading="isSaving(c)" @click="saveContract(ci)">保存此份草稿</el-button>
              <el-button size="small" type="warning" :loading="isPushing(c)" :disabled="!canPushConfirm(c)" @click="pushContract(ci)">
                {{ pushButtonLabel(c) }}
              </el-button>
              <el-button size="small" type="primary" @click="exportContract(ci)">导出此份合同 Word</el-button>
            </div>
          </div>
          <ContractDocumentEditor :contract="c" editable allow-row-delete />

          <div style="text-align: right; margin-top: 20px; padding-top: 16px; border-top: 1px dashed var(--color-border)">
            <el-button @click="saveContract(ci)" :loading="isSaving(c)">保存此份草稿</el-button>
            <el-button type="warning" @click="pushContract(ci)" :loading="isPushing(c)" :disabled="!canPushConfirm(c)">
              {{ pushButtonLabel(c) }}
            </el-button>
            <el-button type="primary" @click="exportContract(ci)">导出此份合同 Word</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchProductList } from '../../services/product'
import { pushContractConfirm, updateContract } from '../../services/contract'
import { generateOrder as generateOrderApi } from '../../services/order'
import { buildContractWord } from '../../utils/contractWord'
import {
  buildContractUpdatePayload,
  createContractDraftFromGenerated,
  ensureContractShape,
  validateDeliveryTotals
} from '../../utils/contractDocument'
import { getContractStatusLabel, getContractStatusTagType, getSupplierConfirmStatusLabel, getSupplierConfirmStatusTagType } from '../../utils/status'
import { saveAs } from 'file-saver'
import { Packer } from 'docx'
import ContractDocumentEditor from '../../components/contracts/ContractDocumentEditor.vue'

const products = ref([])
const selectedProductId = ref('')
const selectedProduct = ref(null)
const totalQty = ref(null)
const skuRows = ref([])
const contracts = ref([])
const activeContract = ref('0')
const savingAll = ref(false)
const pushingAll = ref(false)
const savingMap = ref({})
const pushingMap = ref({})

const checkedSkus = computed(() => skuRows.value.filter(r => r.checked))
const allocatedTotal = computed(() => checkedSkus.value.reduce((s, r) => s + (r.qty || 0), 0))
const normalizedTotalQty = computed(() => Number(totalQty.value || 0))
const remainQty = computed(() => normalizedTotalQty.value - allocatedTotal.value)

onMounted(async () => {
  try {
    const result = await fetchProductList({ page: 1, pageSize: 200 })
    products.value = result.list || []
  } catch (e) {
    ElMessage.error('加载产品列表失败')
  }
})

function statusLabel(status) {
  return getContractStatusLabel(status)
}

function statusTagType(status) {
  return getContractStatusTagType(status)
}

function supplierConfirmLabel(status) {
  return getSupplierConfirmStatusLabel(status)
}

function supplierConfirmTagType(status) {
  return getSupplierConfirmStatusTagType(status)
}

function isSaving(contract) {
  return Boolean(savingMap.value[contract._savedId])
}

function isPushing(contract) {
  return Boolean(pushingMap.value[contract._savedId])
}

function canPushConfirm(contract) {
  return ['DRAFT', 'PENDING_SIGN'].includes(contract._status) && contract._supplierConfirmStatus !== 'CONFIRMED'
}

function pushButtonLabel(contract) {
  return contract._supplierConfirmStatus === 'PENDING_CONFIRM' ? '重新推送确认' : '推送给供应商确认'
}

async function onProductChange(productId) {
  contracts.value = []
  if (!productId) { selectedProduct.value = null; skuRows.value = []; return }

  const product = products.value.find(p => p._id === productId)
  selectedProduct.value = product
  totalQty.value = null

  skuRows.value = (product.skus || []).map(sku => ({
    ...sku,
    checked: true,
    qty: 0
  }))
}

function selectAll() { skuRows.value.forEach(r => r.checked = true); recalcLastSku() }
function deselectAll() { skuRows.value.forEach(r => { r.checked = false; r.qty = 0 }) }

function onSkuCheckChange(row) {
  if (!row.checked) row.qty = 0
  recalcLastSku()
}

function isLastChecked(idx) {
  const checkedIndices = skuRows.value.map((r, i) => r.checked ? i : -1).filter(i => i >= 0)
  return checkedIndices.length > 0 && checkedIndices[checkedIndices.length - 1] === idx
}

function recalcLastSku() {
  const checked = skuRows.value.filter(r => r.checked)
  if (checked.length === 0) return
  if (!normalizedTotalQty.value) return
  const last = checked[checked.length - 1]
  const othersTotal = checked.filter(r => r !== last).reduce((s, r) => s + (r.qty || 0), 0)
  last.qty = Math.max(0, normalizedTotalQty.value - othersTotal)
}

// === Generate contracts ===
async function generateOrder() {
  const checked = skuRows.value.filter(r => r.checked && r.qty > 0)
  if (checked.length === 0) {
    ElMessage.warning('请先选择至少一个 SKU 并填写数量')
    return
  }

  try {
    const result = await generateOrderApi({
      productId: selectedProductId.value,
      totalQty: normalizedTotalQty.value,
      skuAllocations: checked.map(item => ({
        skuId: item.sku_id,
        qty: item.qty
      }))
    })

    contracts.value = (result.contracts || []).map((contract) => {
      const draft = createContractDraftFromGenerated(contract)
      ensureContractShape(draft)
      return draft
    })

    activeContract.value = '0'
    ElMessage.success(`已生成 ${contracts.value.length} 份草稿合同`)
  } catch (error) {
    ElMessage.error(error.message || '生成订单失败')
  }
}

// === Save to DB ===
async function saveAllContracts() {
  savingAll.value = true
  try {
    for (let i = 0; i < contracts.value.length; i += 1) {
      await saveContract(i, false)
    }
    ElMessage.success(`已保存 ${contracts.value.length} 份合同草稿`)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingAll.value = false
  }
}

async function saveContract(index, showMessage = true) {
  const c = contracts.value[index]
  if (!c) return

  savingMap.value = { ...savingMap.value, [c._savedId]: true }
  try {
    validateDeliveryTotals(c)
    const updatedContract = await updateContract(c._savedId, buildContractUpdatePayload(c))
    applyContractState(c, updatedContract)
    if (showMessage) {
      ElMessage.success(`已保存 ${c.supplierName} 合同草稿`)
    }
  } finally {
    const nextMap = { ...savingMap.value }
    delete nextMap[c._savedId]
    savingMap.value = nextMap
  }
}

async function pushContract(index, showMessage = true) {
  const c = contracts.value[index]
  if (!c || !canPushConfirm(c)) return

  pushingMap.value = { ...pushingMap.value, [c._savedId]: true }
  try {
    await saveContract(index, false)
    const result = await pushContractConfirm(c._savedId)
    c._status = result.status || 'PENDING_SIGN'
    c._supplierConfirmStatus = result.supplierConfirmStatus || 'PENDING_CONFIRM'
    if (showMessage) {
      ElMessage.success(`${c.supplierName} 合同已推送给供应商确认`)
    }
  } catch (e) {
    if (showMessage) {
      ElMessage.error(e.message || '推送确认失败')
    }
    throw e
  } finally {
    const nextMap = { ...pushingMap.value }
    delete nextMap[c._savedId]
    pushingMap.value = nextMap
  }
}

async function pushAllContracts() {
  pushingAll.value = true
  try {
    for (let i = 0; i < contracts.value.length; i += 1) {
      if (canPushConfirm(contracts.value[i])) {
        await pushContract(i, false)
      }
    }
    ElMessage.success('已完成全部合同推送确认')
  } catch (e) {
    ElMessage.error(e.message || '批量推送确认失败')
  } finally {
    pushingAll.value = false
  }
}

// === Word export ===
function exportContract(idx) {
  const c = contracts.value[idx]
  try {
    validateDeliveryTotals(c)
  } catch (error) {
    ElMessage.error(error.message || '交付计划数量不一致')
    return
  }
  const doc = buildContractWord(c)
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${c.contractNo}.docx`)
  })
}

function exportAllContracts() {
  contracts.value.forEach((_, i) => {
    setTimeout(() => exportContract(i), i * 500)
  })
}

function applyContractState(targetContract, updatedContract) {
  targetContract.contractNo = updatedContract.contract_no || targetContract.contractNo
  targetContract._status = updatedContract.status || targetContract._status || 'DRAFT'
  targetContract._supplierConfirmStatus = updatedContract.supplier_confirm_status || targetContract._supplierConfirmStatus || 'UNSENT'
}
</script>

<style scoped>
.contract-state-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.contract-state-left,
.contract-state-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-doc {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  padding: 48px 56px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  font-family: 'SimSun', 'Songti SC', serif;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}
.contract-header { text-align: center; margin-bottom: 24px; }
.contract-number { text-align: right; font-size: 13px; color: #666; margin-bottom: 16px; }
.contract-title { font-size: 22px; letter-spacing: 8px; font-weight: 700; }
.contract-parties { margin-bottom: 16px; }
.party-row { margin-bottom: 4px; }
.party-label { color: #666; }
.party-value { font-weight: 500; }
.contract-text { margin-bottom: 8px; text-indent: 2em; text-align: justify; }
.contract-section { font-size: 14px; font-weight: 700; margin: 20px 0 8px; }

.contract-input {
  border: none; border-bottom: 1px solid #1A56DB; background: #EFF6FF;
  padding: 2px 8px; font-size: 14px; font-family: inherit; color: #1A56DB;
  outline: none; border-radius: 0;
}
.contract-input:focus { border-bottom-color: #DC2626; background: #FEF2F2; }
.contract-input-sm {
  border: none; border-bottom: 1px solid #1A56DB; background: #EFF6FF;
  padding: 2px 6px; font-size: 13px; font-family: inherit; color: #1A56DB;
  outline: none; width: 100px; border-radius: 0; text-align: center;
}
.contract-textarea {
  width: 100%; border: 1px solid #E5E7EB; background: #FAFAFA; padding: 8px;
  font-size: 13px; font-family: inherit; min-height: 60px; resize: vertical;
  border-radius: 4px; outline: none;
}
.contract-textarea:focus { border-color: #1A56DB; background: #EFF6FF; }

.contract-table {
  width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px;
}
.contract-table th, .contract-table td {
  border: 1px solid #999; padding: 8px; text-align: center; vertical-align: top;
}
.contract-table th { background: #F3F4F6; font-weight: 600; }
.total-row td { background: #FFFBEB; }

.delivery-table input { font-size: 12px; }

.contract-sign {
  display: flex; justify-content: space-between; margin-top: 40px; padding-top: 24px;
}
.sign-col { width: 45%; }
</style>
