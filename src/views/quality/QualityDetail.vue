<template>
  <div class="quality-detail-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/quality')">返回质检列表</el-button>
        <h2>{{ target.partName || '验货详情' }}</h2>
      </div>
      <el-tag :type="statusTagType(target.displayStatus)">{{ statusLabel(target.displayStatus) }}</el-tag>
    </div>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">验货对象</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="合同编号">{{ target.contractNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ target.supplierName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="批次">第 {{ target.batchNo || '-' }} 批</el-descriptions-item>
        <el-descriptions-item label="计划交期">{{ target.plannedDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="计划数量">{{ formatNumber(target.plannedQty) }}</el-descriptions-item>
        <el-descriptions-item label="已生产数量">{{ formatNumber(target.actualQty || target.plannedQty) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="target.latestInspection" shadow="never" class="section-card">
      <template #header><span class="section-title">最近一次验货记录</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="结论">{{ resultLabel(target.latestInspection.result) }}</el-descriptions-item>
        <el-descriptions-item label="验货时间">{{ formatDateTime(target.latestInspection.inspected_at) }}</el-descriptions-item>
        <el-descriptions-item label="合格数量">{{ formatNumber(target.latestInspection.qualified_qty) }}</el-descriptions-item>
        <el-descriptions-item label="次品数量">{{ formatNumber(target.latestInspection.defect_qty) }}</el-descriptions-item>
        <el-descriptions-item label="次品说明" :span="2">{{ target.latestInspection.defect_desc || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ target.latestInspection.note || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">提交验货结果</span></template>
      <el-form label-width="110px">
        <el-form-item label="验货结论">
          <el-radio-group v-model="form.result" @change="syncQtyByResult">
            <el-radio label="PASS">全部通过</el-radio>
            <el-radio label="PARTIAL_PASS">部分通过</el-radio>
            <el-radio label="FAIL">不通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="合格数量">
          <el-input-number v-model="form.qualifiedQty" :min="0" :max="baseQty" :disabled="form.result === 'PASS'" />
        </el-form-item>
        <el-form-item label="次品数量">
          <el-input-number v-model="form.defectQty" :min="0" :max="baseQty" :disabled="form.result === 'PASS'" />
        </el-form-item>
        <el-form-item label="次品说明">
          <el-input v-model="form.defectDesc" type="textarea" :rows="3" placeholder="轻量版先记录次品原因、位置和处理说明" />
        </el-form-item>
        <el-form-item label="现场备注">
          <el-input v-model="form.note" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="缺陷图片">
          <el-upload
            multiple
            list-type="text"
            :auto-upload="false"
            :show-file-list="true"
            :on-change="handleDefectFileChange"
            :on-remove="handleDefectFileRemove"
            accept="image/*"
          >
            <el-button>选择图片</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" :disabled="target.currentStatus !== 'PENDING_INSPECTION'" @click="handleSubmit">
            提交验货结果
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchInspectionList, createInspection } from '../../services/inspection'
import { uploadCloudFile } from '../../services/cloudbase'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const target = ref({})
const selectedDefectFiles = ref([])
const form = ref({
  result: 'PASS',
  qualifiedQty: 0,
  defectQty: 0,
  defectDesc: '',
  note: ''
})

const baseQty = computed(() => Number(target.value.actualQty || target.value.plannedQty || 0))

async function loadData() {
  loading.value = true
  try {
    const result = await fetchInspectionList({ batchPartId: route.params.batchPartId })
    const row = (result.list || [])[0]
    if (!row) {
      ElMessage.error('验货对象不存在')
      router.replace('/quality')
      return
    }
    target.value = row
    form.value.qualifiedQty = baseQty.value
    form.value.defectQty = 0
  } catch (error) {
    ElMessage.error(error.message || '加载验货详情失败')
  } finally {
    loading.value = false
  }
}

function syncQtyByResult() {
  if (form.value.result === 'PASS') {
    form.value.qualifiedQty = baseQty.value
    form.value.defectQty = 0
    return
  }

  if (form.value.result === 'FAIL') {
    form.value.qualifiedQty = 0
    form.value.defectQty = baseQty.value
  }
}

function handleDefectFileChange(file) {
  if (!file.raw) return
  if (!selectedDefectFiles.value.some(item => item.uid === file.uid)) {
    selectedDefectFiles.value.push({
      uid: file.uid,
      name: file.name,
      raw: file.raw
    })
  }
}

function handleDefectFileRemove(file) {
  selectedDefectFiles.value = selectedDefectFiles.value.filter(item => item.uid !== file.uid)
}

async function handleSubmit() {
  if (target.value.currentStatus !== 'PENDING_INSPECTION') {
    ElMessage.warning('当前对象不处于待验货状态')
    return
  }

  submitting.value = true
  try {
    const defects = []
    for (const file of selectedDefectFiles.value) {
      const safeName = file.name.replace(/[^\w.-]+/g, '_')
      const uploadResult = await uploadCloudFile({
        cloudPath: `inspection/${target.value.batchPartId}/${Date.now()}_${safeName}`,
        file: file.raw
      })
      defects.push({
        photo_file_id: uploadResult.fileID || uploadResult.fileId,
        description: form.value.defectDesc || file.name
      })
    }

    await createInspection({
      batchPartId: target.value.batchPartId,
      result: form.value.result,
      qualifiedQty: form.value.qualifiedQty,
      defectQty: form.value.defectQty,
      defectDesc: form.value.defectDesc,
      note: form.value.note,
      defects
    })
    ElMessage.success('验货结果已提交')
    selectedDefectFiles.value = []
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '提交验货失败')
  } finally {
    submitting.value = false
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function resultLabel(result) {
  return {
    PASS: '全部通过',
    PARTIAL_PASS: '部分通过',
    FAIL: '不通过'
  }[result] || result || '-'
}

function statusLabel(status) {
  return {
    PENDING_INSPECTION: '待验货',
    PASS: '全部通过',
    PARTIAL_PASS: '部分通过',
    FAILED: '验货未通过',
    PENDING_SHIPMENT: '待发货'
  }[status] || status || '-'
}

function statusTagType(status) {
  return {
    PENDING_INSPECTION: 'warning',
    PASS: 'success',
    PARTIAL_PASS: 'primary',
    FAILED: 'danger',
    PENDING_SHIPMENT: 'success'
  }[status] || 'info'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
}

.section-card {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
}
</style>
