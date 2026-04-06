<template>
  <div class="quality-page">
    <div class="page-header">
      <h2>质检管理</h2>
      <el-button @click="loadData">刷新</el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="loadData">
      <el-tab-pane label="待验货" name="pending" />
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="已验货" name="done" />
    </el-tabs>

    <el-table :data="rows" border v-loading="loading" @row-click="goDetail" style="cursor: pointer">
      <el-table-column prop="contractNo" label="合同编号" width="220" />
      <el-table-column prop="supplierName" label="供应商" width="160" />
      <el-table-column prop="partName" label="配件名称" min-width="220" />
      <el-table-column label="批次" width="120">
        <template #default="{ row }">第 {{ row.batchNo }} 批</template>
      </el-table-column>
      <el-table-column prop="plannedDate" label="计划交期" width="140" />
      <el-table-column label="计划数量" width="120" align="right">
        <template #default="{ row }">{{ formatNumber(row.plannedQty) }}</template>
      </el-table-column>
      <el-table-column label="当前状态" width="140">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.displayStatus)">{{ statusLabel(row.displayStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="验货结果" width="140">
        <template #default="{ row }">
          <span v-if="row.latestInspection">{{ inspectionResultLabel(row.latestInspection.result) }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="最近验货时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.latestInspection?.inspected_at) }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && rows.length === 0" :description="emptyText" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchInspectionList } from '../../services/inspection'
import { getInspectionDisplayStatusLabel, getInspectionDisplayStatusTagType, getInspectionResultLabel } from '../../utils/status'

const router = useRouter()
const activeTab = ref('pending')
const loading = ref(false)
const rows = ref([])
const emptyTextMap = {
  pending: '暂无待验货任务',
  all: '暂无验货记录',
  done: '暂无已完成的验货记录'
}

async function loadData() {
  loading.value = true
  try {
    const result = await fetchInspectionList({ status: activeTab.value })
    rows.value = result.list || []
  } catch (error) {
    ElMessage.error(error.message || '加载质检列表失败')
  } finally {
    loading.value = false
  }
}

function goDetail(row) {
  router.push(`/quality/${row.batchPartId}`)
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

function statusLabel(status) {
  return getInspectionDisplayStatusLabel(status)
}

function inspectionResultLabel(result) {
  return getInspectionResultLabel(result)
}

function statusTagType(status) {
  return getInspectionDisplayStatusTagType(status)
}

const emptyText = computed(() => emptyTextMap[activeTab.value] || '暂无数据')

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
}
</style>
