<template>
  <div class="shipment-page">
    <div class="page-header">
      <h2>发货管理</h2>
      <el-button @click="loadData">刷新</el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="loadData">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane label="待确认" name="pending" />
      <el-tab-pane label="在途" name="transit" />
      <el-tab-pane label="已完成" name="arrived" />
    </el-tabs>

    <el-table :data="rows" border v-loading="loading" style="cursor: pointer" @row-click="goDetail">
      <el-table-column prop="shipment_no" label="发货单号" width="180" />
      <el-table-column prop="shipper_name" label="发货方" width="160" />
      <el-table-column label="路线" min-width="260">
        <template #default="{ row }">{{ row.from_address_label }} → {{ row.to_address_label }}</template>
      </el-table-column>
      <el-table-column label="货品" min-width="220">
        <template #default="{ row }">{{ row.items.map(item => item.item_name).join('、') }}</template>
      </el-table-column>
      <el-table-column label="计划/实际" width="140" align="right">
        <template #default="{ row }">{{ formatNumber(row.planned_total_qty) }} / {{ formatNumber(row.actual_total_qty) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量调整" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.need_confirm && !row.confirmed_at" type="warning">待甲方确认</el-tag>
          <span v-else>{{ row.has_modified_qty ? '已确认' : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && rows.length === 0" description="暂无发货单" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchShipmentList } from '../../services/shipment'
import { getGoodsStatusLabel, getGoodsStatusTagType } from '../../utils/status'

const router = useRouter()
const activeTab = ref('all')
const loading = ref(false)
const rows = ref([])

async function loadData() {
  loading.value = true
  try {
    const statusMap = {
      all: '',
      pending: 'CREATED',
      transit: 'IN_TRANSIT',
      arrived: 'ARRIVED'
    }
    const result = await fetchShipmentList({
      page: 1,
      pageSize: 100,
      status: statusMap[activeTab.value] || ''
    })
    rows.value = result.list || []
  } catch (error) {
    ElMessage.error(error.message || '加载发货单失败')
  } finally {
    loading.value = false
  }
}

function goDetail(row) {
  router.push(`/shipments/${row._id}`)
}

function statusLabel(status) {
  if (status === 'CREATED') return '待司机接单'
  return getGoodsStatusLabel(status)
}

function statusTagType(status) {
  if (status === 'CREATED') return 'warning'
  return getGoodsStatusTagType(status)
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
