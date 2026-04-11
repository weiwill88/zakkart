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
      <div v-if="defectMediaList.length > 0" class="media-preview-grid">
        <div v-for="media in defectMediaList" :key="media.defectId" class="media-preview-item">
          <el-image v-if="media.mediaType === 'image'" :src="media.url" fit="cover" :preview-src-list="imagePreviewUrls" />
          <video v-else class="media-video" :src="media.url" controls preload="metadata"></video>
          <div class="media-caption">{{ media.description || media.fileName || '现场附件' }}</div>
        </div>
      </div>
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
        <el-form-item label="缺陷附件">
          <el-upload
            multiple
            list-type="text"
            :auto-upload="false"
            :show-file-list="true"
            :on-change="handleDefectFileChange"
            :on-remove="handleDefectFileRemove"
            accept="image/*,video/*"
          >
            <el-button>选择图片/视频</el-button>
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
import { getTempFileURLs, uploadCloudFile } from '../../services/cloudbase'
import { getInspectionDisplayStatusLabel, getInspectionDisplayStatusTagType, getInspectionResultLabel } from '../../utils/status'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const target = ref({})
const selectedDefectFiles = ref([])
const defectMediaList = ref([])
const form = ref({
  result: 'PASS',
  qualifiedQty: 0,
  defectQty: 0,
  defectDesc: '',
  note: ''
})

const baseQty = computed(() => Number(target.value.actualQty || target.value.plannedQty || 0))
const imagePreviewUrls = computed(() => defectMediaList.value.filter(item => item.mediaType === 'image').map(item => item.url))

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
    defectMediaList.value = await resolveInspectionMedia(row.latestInspection?.defects || [])
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
        media_type: file.raw.type?.startsWith('video/') ? 'video' : 'image',
        file_name: file.name,
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
  return getInspectionResultLabel(result)
}

function statusLabel(status) {
  return getInspectionDisplayStatusLabel(status)
}

function statusTagType(status) {
  return getInspectionDisplayStatusTagType(status)
}

async function resolveInspectionMedia(defects) {
  const mediaList = Array.isArray(defects) ? defects : []
  const fileIds = mediaList.map(item => item.photo_file_id).filter(Boolean)
  if (fileIds.length === 0) {
    return []
  }

  const result = await getTempFileURLs(fileIds)
  const urlMap = (result.fileList || []).reduce((acc, item) => {
    if (item.fileID && item.tempFileURL) {
      acc[item.fileID] = item.tempFileURL
    }
    return acc
  }, {})

  return mediaList
    .map(item => ({
      defectId: item.defect_id,
      mediaType: item.media_type === 'video' ? 'video' : 'image',
      description: item.description || '',
      fileName: item.file_name || '',
      url: urlMap[item.photo_file_id] || ''
    }))
    .filter(item => item.url)
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

.media-preview-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.media-preview-item {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.media-preview-item :deep(.el-image) {
  width: 100%;
  height: 180px;
  display: block;
}

.media-video {
  width: 100%;
  height: 180px;
  display: block;
  background: #000;
}

.media-caption {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
