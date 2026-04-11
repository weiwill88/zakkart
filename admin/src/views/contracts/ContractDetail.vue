<template>
  <div class="contract-detail-page" v-loading="loading">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/contracts')">
          <el-icon><ArrowLeft /></el-icon> 返回合同列表
        </el-button>
        <h2>{{ contract.contract_no || '合同详情' }}</h2>
        <el-tag :type="statusTagType(contract.status)" v-if="contract.status">{{ statusLabel(contract.status) }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button v-if="canEdit" @click="toggleEditing">
          {{ editing ? '取消编辑' : '编辑合同' }}
        </el-button>
        <el-button v-if="canEdit && editing" type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
        <el-button v-if="canPushConfirm" type="warning" :loading="pushingConfirm" @click="handlePushConfirm">
          {{ contract.supplier_confirm_status === 'PENDING_CONFIRM' ? '重新推送确认' : '推送给供应商确认' }}
        </el-button>
        <el-button v-if="canExport" type="warning" :loading="exporting" @click="handleExportWord">
          导出 Word
        </el-button>
        <el-upload
          v-if="canUploadSigned"
          :before-upload="handleUploadSigned"
          :show-file-list="false"
          accept=".pdf"
        >
          <el-button type="success">上传已签署 PDF</el-button>
        </el-upload>
        <el-button v-if="contract.signed_pdf_file_id" :loading="viewingSignedPdf" @click="handleViewSignedPdf">
          查看已签 PDF
        </el-button>
      </div>
    </div>

    <!-- Basic Info -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">基本信息</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="合同编号">{{ contract.contract_no }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ contract.supplier_name }}</el-descriptions-item>
        <el-descriptions-item label="产品">{{ contract.product_name }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(contract.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="订金比例">
          {{ ((contract.deposit_ratio || 0.3) * 100).toFixed(0) }}%
        </el-descriptions-item>
        <el-descriptions-item label="尾款比例">
          {{ ((contract.final_ratio || 0.7) * 100).toFixed(0) }}%
        </el-descriptions-item>
        <el-descriptions-item label="合同总金额">
          <strong>{{ (contract.total_amount || 0).toLocaleString() }} 元</strong>
        </el-descriptions-item>
        <el-descriptions-item label="供应商确认">
          <el-tag :type="getSupplierConfirmStatusTagType(contract.supplier_confirm_status)">
            {{ getSupplierConfirmStatusLabel(contract.supplier_confirm_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="签署时间" v-if="contract.signed_at">
          {{ formatDate(contract.signed_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="确认时间" v-if="contract.supplier_confirmed_at">
          {{ formatDate(contract.supplier_confirmed_at) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">合同原文</span></template>
      <ContractDocumentEditor
        v-if="draftContract"
        :contract="draftContract"
        :editable="editing"
        :allow-row-delete="editing && batches.length === 0"
      />
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">展示说明</span></template>
      <div class="plain-hint">
        合同正文已经包含采购货物说明、规格说明和交付表。这里不再重复展示同一份内容，避免出现空白字段与多处不一致。
      </div>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header-row">
          <span class="section-title">交付批次管理</span>
          <el-button v-if="canAddBatch" size="small" type="primary" @click="showBatchDialog = true">
            新增批次
          </el-button>
        </div>
      </template>
      <div v-if="batches.length === 0" class="empty-hint">
        暂无结构化交付批次。签署并上传已签合同后，系统会按合同交付表自动生成批次；如需提前维护，也可以手动新增。
      </div>
      <div v-else class="batch-summary-list">
        <div v-for="batch in batches" :key="batch._id" class="batch-summary-card">
          <div class="batch-header">
            <div>
              <span class="batch-title">批次 {{ batch.batch_no }} — {{ batch.planned_date || '-' }}</span>
              <div class="batch-meta">
                <span>配件 {{ (batch.parts || []).length }} 项</span>
                <span>计划总量 {{ getBatchTotalQty(batch).toLocaleString() }}</span>
              </div>
            </div>
            <span class="batch-actions">
              <el-button text size="small" @click="openEditBatch(batch)">编辑</el-button>
              <el-button v-if="(batch.change_logs || []).length > 0" text size="small" @click="openBatchHistory(batch)">变更历史</el-button>
              <el-popconfirm title="确定删除该批次？" @confirm="handleDeleteBatch(batch._id)">
                <template #reference>
                  <el-button text size="small" type="danger" :disabled="!isBatchDeletable(batch)">删除</el-button>
                </template>
              </el-popconfirm>
            </span>
          </div>
          <div class="status-chip-row">
            <el-tag
              v-for="statusItem in getBatchStatusSummary(batch)"
              :key="`${batch._id}-${statusItem.key}`"
              :type="statusItem.type"
              size="small"
            >
              {{ statusItem.label }} {{ statusItem.count }}
            </el-tag>
          </div>
          <div v-if="batch.note" class="batch-note">备注：{{ batch.note }}</div>
          <div v-if="(batch.change_logs || []).length > 0" class="batch-change-log">
            最近调整：{{ formatBatchChange(batch.change_logs[0]) }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- Signed Snapshot -->
    <el-card v-if="contract.snapshot" shadow="never" class="section-card">
      <template #header><span class="section-title">签署快照</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="供应商名称">{{ contract.snapshot.supplier_name }}</el-descriptions-item>
        <el-descriptions-item label="信用代码">{{ contract.snapshot.supplier_credit_code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="法人">{{ contract.snapshot.supplier_legal_person || '-' }}</el-descriptions-item>
        <el-descriptions-item label="快照时间">{{ formatDate(contract.snapshot.snapshot_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Signed PDF link -->
    <el-card v-if="contract.signed_pdf_file_id" shadow="never" class="section-card">
      <template #header><span class="section-title">已签署文件</span></template>
      <p>云存储 FileID：<code>{{ contract.signed_pdf_file_id }}</code></p>
      <p class="file-hint">这里显示的是云存储 FileID，不是公网直链地址。</p>
      <el-button text type="primary" :loading="viewingSignedPdf" @click="handleViewSignedPdf">查看已签 PDF</el-button>
    </el-card>

    <!-- Batch Dialog -->
    <el-dialog v-model="showBatchDialog" :title="batchEditId ? '编辑批次' : '新增批次'" width="640px" @close="resetBatchForm">
      <el-form label-width="100px">
        <el-form-item label="交付日期">
          <el-date-picker v-model="batchForm.planned_date" type="date" value-format="YYYY-MM-DD" placeholder="选择交付日期" style="width: 220px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="batchForm.note" placeholder="选填" />
        </el-form-item>
        <el-form-item v-if="batchEditId" label="调整原因" required>
          <el-input
            v-model="batchForm.change_reason"
            type="textarea"
            :rows="3"
            placeholder="请写明本次日期/数量调整原因，该记录会进入交付计划变更历史"
          />
        </el-form-item>
        <el-form-item label="配件明细">
          <el-table :data="batchForm.parts" border size="small">
            <el-table-column prop="part_name" label="配件名称" />
            <el-table-column label="计划数量" width="160">
              <template #default="{ row }">
                <el-input-number v-model="row.planned_qty" :min="0" :step="100" controls-position="right" size="small" style="width: 130px" />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" :loading="batchSaving" @click="handleSaveBatch">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatchHistoryDialog" title="交付计划变更历史" width="720px">
      <el-empty v-if="batchHistoryRows.length === 0" description="暂无交付计划变更记录" />
      <div v-else class="batch-history-list">
        <div v-for="item in batchHistoryRows" :key="item.change_id || item.created_at" class="history-card">
          <div class="history-head">
            <strong>{{ item.reason || '未填写原因' }}</strong>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <div class="history-operator">{{ item.operator_name || '甲方管理员' }}</div>
          <ul class="history-detail-list">
            <li v-for="(detail, index) in item.details || []" :key="`${item.change_id || item.created_at}-${index}`">
              {{ detail }}
            </li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { fetchContractDetail, updateContract, exportContractWord, pushContractConfirm, uploadSignedContract, fetchSignedContractFileUrl } from '../../services/contract'
import { fetchBatchList, createBatch, updateBatch, deleteBatch } from '../../services/batch'
import { uploadCloudFile } from '../../services/cloudbase'
import { buildContractWord } from '../../utils/contractWord'
import { buildContractUpdatePayload, createContractDraftFromDetail } from '../../utils/contractDocument'
import { getContractStatusLabel, getContractStatusTagType, getGoodsStatusLabel, getGoodsStatusTagType, getSupplierConfirmStatusLabel, getSupplierConfirmStatusTagType } from '../../utils/status'
import ContractDocumentEditor from '../../components/contracts/ContractDocumentEditor.vue'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const contract = ref({})
const batches = ref([])
const loading = ref(false)
const editing = ref(false)
const saving = ref(false)
const exporting = ref(false)
const pushingConfirm = ref(false)
const viewingSignedPdf = ref(false)
const draftContract = ref(null)

// Batch dialog
const showBatchDialog = ref(false)
const batchEditId = ref(null)
const batchSaving = ref(false)
const batchForm = ref({ planned_date: '', note: '', change_reason: '', parts: [] })
const showBatchHistoryDialog = ref(false)
const batchHistoryRows = ref([])

function statusLabel(s) { return getContractStatusLabel(s) }
function statusTagType(s) { return getContractStatusTagType(s) }
function goodsStatusLabel(s) { return getGoodsStatusLabel(s) }
function goodsStatusTagType(s) { return getGoodsStatusTagType(s) }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const canEdit = computed(() => ['DRAFT', 'PENDING_SIGN'].includes(contract.value.status))
const canExport = computed(() => ['DRAFT', 'PENDING_SIGN'].includes(contract.value.status))
const canUploadSigned = computed(() => ['DRAFT', 'PENDING_SIGN'].includes(contract.value.status))
const canPushConfirm = computed(() => ['DRAFT', 'PENDING_SIGN'].includes(contract.value.status) && contract.value.supplier_confirm_status !== 'CONFIRMED')
const canManageDeliveryPlan = computed(() => ['super_admin', 'admin'].includes(authStore.user?.role) && authStore.hasAdminPermission('module_contract'))
const canAddBatch = computed(() => canManageDeliveryPlan.value && ['DRAFT', 'PENDING_SIGN', 'SIGNED', 'EXECUTING'].includes(contract.value.status))
const contractPartRows = computed(() => getContractPartRows(contract.value))

function isBatchDeletable(batch) {
  return (batch.parts || []).every(p => p.status === 'PENDING_PRODUCTION')
}

function getBatchTotalQty(batch) {
  return (batch.parts || []).reduce((sum, part) => sum + Number(part.planned_qty || 0), 0)
}

function getBatchStatusSummary(batch) {
  const counts = new Map()
  ;(batch.parts || []).forEach((part) => {
    const key = part.status || 'UNKNOWN'
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  if (counts.size === 0) {
    return [{ key: 'empty', label: '暂无配件', count: 0, type: 'info' }]
  }

  return Array.from(counts.entries()).map(([key, count]) => ({
    key,
    label: goodsStatusLabel(key),
    count,
    type: goodsStatusTagType(key)
  }))
}

async function loadContract() {
  loading.value = true
  try {
    const id = route.params.id
    const [contractData, batchData] = await Promise.all([
      fetchContractDetail(id),
      fetchBatchList(id)
    ])
    contract.value = contractData
    batches.value = batchData.list || []
    draftContract.value = createContractDraftFromDetail(contractData)
  } catch (e) {
    ElMessage.error(e.message || '加载合同详情失败')
  } finally {
    loading.value = false
  }
}

function toggleEditing() {
  if (editing.value) {
    editing.value = false
    draftContract.value = createContractDraftFromDetail(contract.value)
  } else {
    editing.value = true
    draftContract.value = createContractDraftFromDetail(contract.value)
  }
}

async function handleSave() {
  if (!draftContract.value) return
  saving.value = true
  try {
    await updateContract(route.params.id, buildContractUpdatePayload(draftContract.value))

    ElMessage.success('合同已保存')
    editing.value = false
    await loadContract()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleExportWord() {
  exporting.value = true
  try {
    const result = await exportContractWord(route.params.id)
    const { Packer } = await import('docx')
    const { saveAs } = await import('file-saver')
    const doc = buildContractWord(createContractDraftFromDetail(result.contract))
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${result.contract.contract_no || '合同'}.docx`)
    ElMessage.success('Word 文件已生成并下载')
    await loadContract()
  } catch (e) {
    ElMessage.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

async function handlePushConfirm() {
  pushingConfirm.value = true
  try {
    await pushContractConfirm(route.params.id)
    ElMessage.success('已推送给供应商确认')
    await loadContract()
  } catch (e) {
    ElMessage.error(e.message || '推送确认失败')
  } finally {
    pushingConfirm.value = false
  }
}

async function handleUploadSigned(file) {
  try {
    const timestamp = Date.now()
    const safeName = (file.name || 'signed.pdf').replace(/[^\w.-]+/g, '_')
    const uploadResult = await uploadCloudFile({
      cloudPath: `contracts/signed/${route.params.id}/${timestamp}_${safeName}`,
      file
    })
    const fileId = uploadResult.fileID || uploadResult.fileId
    await uploadSignedContract(route.params.id, fileId)
    ElMessage.success('已签署文件上传成功')
    await loadContract()
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  }

  return false // prevent default upload
}

async function handleViewSignedPdf() {
  viewingSignedPdf.value = true
  try {
    const result = await fetchSignedContractFileUrl(route.params.id)
    const response = await fetch(result.tempUrl)
    if (!response.ok) {
      throw new Error('文件下载失败')
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const previewWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!previewWindow) {
      const link = document.createElement('a')
      link.href = objectUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.click()
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (e) {
    ElMessage.error(e.message || '打开 PDF 失败')
  } finally {
    viewingSignedPdf.value = false
  }
}

// Batch operations
function resetBatchForm() {
  batchEditId.value = null
  batchForm.value = { planned_date: '', note: '', change_reason: '', parts: [] }
}

function openEditBatch(batch) {
  if (!canManageDeliveryPlan.value) {
    ElMessage.warning('只有甲方管理员可以调整交付计划')
    return
  }
  batchEditId.value = batch._id
  batchForm.value = {
    planned_date: batch.planned_date,
    note: batch.note || '',
    change_reason: '',
    parts: (batch.parts || []).map(p => ({ ...p }))
  }
  showBatchDialog.value = true
}

function openBatchHistory(batch) {
  batchHistoryRows.value = Array.isArray(batch.change_logs) ? batch.change_logs : []
  showBatchHistoryDialog.value = true
}

async function handleSaveBatch() {
  if (!batchForm.value.planned_date) {
    ElMessage.warning('请选择交付日期')
    return
  }
  if (batchEditId.value && !String(batchForm.value.change_reason || '').trim()) {
    ElMessage.warning('请填写本次交付计划调整原因')
    return
  }

  batchSaving.value = true
  try {
    if (batchEditId.value) {
      // Update existing batch
      await updateBatch(batchEditId.value, {
        planned_date: batchForm.value.planned_date,
        note: batchForm.value.note,
        change_reason: batchForm.value.change_reason,
        parts: batchForm.value.parts
      })
      ElMessage.success('批次已更新')
    } else {
      // Create new batch - use contract items as default parts
      const parts = batchForm.value.parts.length > 0
        ? batchForm.value.parts
        : contractPartRows.value.map(item => ({
            part_type_id: item.part_type_id,
            part_name: item.part_name,
            planned_qty: 0
          }))

      await createBatch({
        contractId: route.params.id,
        planned_date: batchForm.value.planned_date,
        note: batchForm.value.note,
        parts
      })
      ElMessage.success('批次已创建')
    }

    showBatchDialog.value = false
    await loadContract()
  } catch (e) {
    ElMessage.error(e.message || '保存批次失败')
  } finally {
    batchSaving.value = false
  }
}

async function handleDeleteBatch(id) {
  try {
    await deleteBatch(id)
    ElMessage.success('批次已删除')
    await loadContract()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

// Initialize batch form when opening new batch dialog
function initNewBatchParts() {
  batchForm.value.parts = contractPartRows.value.map(item => ({
    part_type_id: item.part_type_id,
    part_name: item.part_name,
    planned_qty: 0
  }))
}

function formatBatchChange(changeLog = {}) {
  const detailText = Array.isArray(changeLog.details) ? changeLog.details.join('；') : ''
  return `${changeLog.reason || '未填写原因'}${detailText ? `（${detailText}）` : ''} · ${formatDate(changeLog.created_at)}`
}

function getContractPartRows(contractData = {}) {
  const productItems = Array.isArray(contractData.product_items) ? contractData.product_items : []
  if (productItems.length > 0) {
    return productItems.map(item => ({
      part_type_id: item.part_type_id || '',
      part_name: item.part_name || item.model || '未命名配件'
    }))
  }

  return (contractData.items || []).map(item => ({
    part_type_id: item.part_type_id || '',
    part_name: item.part_name || item.sku_spec || '未命名配件'
  }))
}

// Watch showBatchDialog to init parts for new batch
import { watch } from 'vue'
watch(showBatchDialog, (val) => {
  if (val && !batchEditId.value) {
    initNewBatchParts()
  }
})

onMounted(() => {
  loadContract()
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left h2 {
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.section-card {
  margin-bottom: 16px;
}
.section-title {
  font-weight: 600;
}

.file-hint {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.plain-hint {
  color: var(--el-text-color-secondary);
  line-height: 1.8;
}
.batch-summary-list {
  display: grid;
  gap: 12px;
}
.batch-summary-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  padding: 14px 16px;
}
.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}
.batch-title {
  font-weight: 600;
  font-size: 14px;
}
.batch-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.status-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.batch-note {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.batch-change-log {
  margin-top: 8px;
  color: var(--el-color-primary);
  font-size: 12px;
}
.empty-hint {
  padding: 20px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
.batch-history-list {
  display: grid;
  gap: 12px;
}
.history-card {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
}
.history-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.history-operator {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.history-detail-list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--el-text-color-primary);
}
</style>
