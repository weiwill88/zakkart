<template>
  <div class="shipment-detail-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/shipments')">返回发货列表</el-button>
        <h2>{{ shipment.shipment_no || '发货单详情' }}</h2>
      </div>
      <el-tag :type="statusTagType(shipment.status)">{{ statusLabel(shipment.status) }}</el-tag>
    </div>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">基本信息</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="发货方">{{ shipment.shipper_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="目的地">{{ shipment.to_address_label || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货地址">{{ shipment.from_address_label || '-' }}</el-descriptions-item>
        <el-descriptions-item label="司机扫码链接">
          <el-link v-if="qrCode.h5Url" type="primary" @click="copyH5Url">{{ qrCode.h5Url }}</el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="数量调整确认">{{ shipment.need_confirm && !shipment.confirmed_at ? '待确认' : shipment.confirmed_at ? formatDateTime(shipment.confirmed_at) : '无需确认' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(shipment.created_at) }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="shipment.need_confirm && !shipment.confirmed_at" class="action-row">
        <el-button type="primary" :loading="confirming" @click="handleConfirmQty('CONFIRM')">确认发货数量</el-button>
        <el-button :loading="confirming" @click="handleConfirmQty('REINSPECT')">要求二次验货</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">发货明细</span></template>
      <el-table :data="shipment.items || []" border>
        <el-table-column prop="item_name" label="货品" min-width="220" />
        <el-table-column label="计划数量" width="120" align="right">
          <template #default="{ row }">{{ formatNumber(row.planned_qty) }}</template>
        </el-table-column>
        <el-table-column label="实际发货" width="120" align="right">
          <template #default="{ row }">{{ formatNumber(row.actual_qty) }}</template>
        </el-table-column>
        <el-table-column label="实际收货" width="120" align="right">
          <template #default="{ row }">{{ row.actual_received_qty != null ? formatNumber(row.actual_received_qty) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="qty_modify_reason" label="数量调整原因" min-width="200" />
        <el-table-column prop="exception_note" label="收货异常" min-width="180" />
      </el-table>
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">司机记录</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="司机姓名">{{ shipment.driver?.driver_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="车牌号">{{ shipment.driver?.plate_number || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ shipment.driver?.driver_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="首次扫码">{{ formatDateTime(shipment.driver?.step1_at) }}</el-descriptions-item>
        <el-descriptions-item label="接单 GPS">{{ shipment.driver?.step1_gps_text || '-' }}</el-descriptions-item>
        <el-descriptions-item label="确认提货">{{ formatDateTime(shipment.driver?.step2_at) }}</el-descriptions-item>
        <el-descriptions-item label="提货 GPS">{{ shipment.driver?.step2_gps_text || '-' }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="shipment.driver?.signature_temp_url || shipment.driver?.loading_photo_temp_url" class="driver-media-grid">
        <div v-if="shipment.driver?.signature_temp_url" class="driver-media-card">
          <p class="driver-media-title">手写签名</p>
          <el-image :src="shipment.driver.signature_temp_url" :preview-src-list="driverPreviewUrls" fit="cover" class="driver-media-image" />
        </div>
        <div v-if="shipment.driver?.loading_photo_temp_url" class="driver-media-card">
          <p class="driver-media-title">装车照片</p>
          <el-image :src="shipment.driver.loading_photo_temp_url" :preview-src-list="driverPreviewUrls" fit="cover" class="driver-media-image" />
        </div>
      </div>
      <el-empty v-else description="司机尚未上传提货凭证" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchShipmentDetail, confirmShipmentQty, fetchShipmentQrCode } from '../../services/shipment'
import { getGoodsStatusLabel, getGoodsStatusTagType } from '../../utils/status'

const route = useRoute()
const loading = ref(false)
const confirming = ref(false)
const shipment = ref({ items: [], driver: null })
const qrCode = ref({})
const driverPreviewUrls = computed(() => {
  return [shipment.value.driver?.signature_temp_url, shipment.value.driver?.loading_photo_temp_url].filter(Boolean)
})

async function loadData() {
  loading.value = true
  try {
    const [detail, qr] = await Promise.all([
      fetchShipmentDetail(route.params.id),
      fetchShipmentQrCode(route.params.id).catch(() => ({}))
    ])
    shipment.value = detail
    qrCode.value = qr || {}
  } catch (error) {
    ElMessage.error(error.message || '加载发货单详情失败')
  } finally {
    loading.value = false
  }
}

async function handleConfirmQty(decision) {
  confirming.value = true
  try {
    await confirmShipmentQty(route.params.id, decision)
    ElMessage.success(decision === 'CONFIRM' ? '已确认发货数量' : '已回退到待验货')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    confirming.value = false
  }
}

async function copyH5Url() {
  if (!qrCode.value.h5Url) return
  try {
    await navigator.clipboard.writeText(qrCode.value.h5Url)
    ElMessage.success('司机扫码链接已复制')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
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

.action-row {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.driver-media-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.driver-media-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
}

.driver-media-title {
  margin: 0 0 12px;
  font-weight: 600;
  color: #475569;
}

.driver-media-image {
  width: 100%;
  height: 220px;
  border-radius: 10px;
  overflow: hidden;
}
</style>
