<template>
  <div class="notification-page">
    <div class="page-header">
      <div>
        <h2>通知中心</h2>
        <p class="page-subtitle">当前未读 {{ unreadTotal }} 条</p>
      </div>
      <div class="header-actions">
        <el-button :disabled="unreadTotal === 0" @click="handleReadAll">全部已读</el-button>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.read ? 'info' : 'danger'">{{ row.read ? '已读' : '未读' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="220" />
      <el-table-column prop="content" label="内容" min-width="320" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button text :disabled="row.read" @click="handleRead(row)">标记已读</el-button>
          <el-button text type="primary" @click="handleOpen(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && rows.length === 0" description="暂无通知" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchNotificationList, markNotificationRead, markAllNotificationsRead } from '../../services/notification'

const router = useRouter()
const loading = ref(false)
const rows = ref([])
const unreadTotal = ref(0)

async function loadData() {
  loading.value = true
  try {
    const result = await fetchNotificationList({ page: 1, pageSize: 100 })
    rows.value = result.list || []
    unreadTotal.value = Number(result.unreadTotal || 0)
  } catch (error) {
    ElMessage.error(error.message || '加载通知失败')
  } finally {
    loading.value = false
  }
}

async function handleRead(row) {
  try {
    await markNotificationRead(row._id)
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '标记已读失败')
  }
}

async function handleReadAll() {
  try {
    await markAllNotificationsRead()
    ElMessage.success('已全部标记为已读')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '全部已读失败')
  }
}

async function handleOpen(row) {
  if (!row.read) {
    await handleRead(row)
  }

  const targetType = row.target_type || row.reference_type || ''
  const targetId = row.target_id || row.reference_id || ''
  if (targetType === 'shipment' && targetId) {
    router.push(`/shipments/${targetId}`)
    return
  }
  if (targetType === 'contract' && targetId) {
    router.push(`/contracts/${targetId}`)
    return
  }
  if (targetType === 'freight_document') {
    router.push('/freight')
    return
  }

  ElMessage.info('该通知暂无可跳转页面')
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
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 12px;
}
</style>
