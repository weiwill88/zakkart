<template>
  <div class="contract-list-page">
    <div class="page-header">
      <h2>合同管理</h2>
    </div>

    <!-- Status filter tabs -->
    <el-tabs v-model="activeStatus" @tab-change="handleStatusChange">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="草稿" name="DRAFT" />
      <el-tab-pane label="待签约" name="PENDING_SIGN" />
      <el-tab-pane label="已签署" name="SIGNED" />
      <el-tab-pane label="执行中" name="EXECUTING" />
      <el-tab-pane label="已完成" name="COMPLETED" />
    </el-tabs>

    <!-- Search -->
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索合同编号、供应商、产品"
        clearable
        style="width: 300px"
        @clear="loadData"
        @keyup.enter="loadData"
      >
        <template #append>
          <el-button @click="loadData">搜索</el-button>
        </template>
      </el-input>
    </div>

    <!-- Table -->
    <el-table :data="contracts" v-loading="loading" border @row-click="handleRowClick" style="cursor: pointer">
      <el-table-column prop="contract_no" label="合同编号" width="220" />
      <el-table-column prop="supplier_name" label="供应商" width="160" />
      <el-table-column prop="product_name" label="产品" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="供应商确认" width="140">
        <template #default="{ row }">
          <el-tag :type="getSupplierConfirmStatusTagType(row.supplier_confirm_status)" size="small">
            {{ getSupplierConfirmStatusLabel(row.supplier_confirm_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="合同金额" width="130" align="right">
        <template #default="{ row }">
          {{ row.total_amount ? `${row.total_amount.toLocaleString()}` : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadData"
        @size-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchContractList } from '../../services/contract'
import { getContractStatusLabel, getContractStatusTagType, getSupplierConfirmStatusLabel, getSupplierConfirmStatusTagType } from '../../utils/status'

const router = useRouter()

const contracts = ref([])
const loading = ref(false)
const keyword = ref('')
const activeStatus = ref('all')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function statusLabel(status) {
  return getContractStatusLabel(status)
}

function statusTagType(status) {
  return getContractStatusTagType(status)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function handleStatusChange() {
  page.value = 1
  loadData()
}

function handleRowClick(row) {
  router.push(`/contracts/${row._id}`)
}

async function loadData() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    if (keyword.value) params.keyword = keyword.value
    if (activeStatus.value !== 'all') params.status = activeStatus.value

    const result = await fetchContractList(params)
    contracts.value = result.list || []
    total.value = result.total || 0
  } catch (e) {
    ElMessage.error(e.message || '加载合同列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
}
.toolbar {
  margin-bottom: 16px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
