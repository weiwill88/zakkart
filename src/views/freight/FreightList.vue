<template>
  <div class="freight-page">
    <div class="page-header">
      <h2>货代单据</h2>
      <div class="header-actions">
        <el-button @click="openDialog">上传入库指示单</el-button>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column prop="file_name" label="文件名" min-width="220" />
      <el-table-column label="关联发货单" min-width="240">
        <template #default="{ row }">
          <div v-if="row.shipments.length === 0">-</div>
          <div v-for="shipment in row.shipments" :key="shipment._id">{{ shipment.shipment_no }} · {{ shipment.shipper_name }}</div>
        </template>
      </el-table-column>
      <el-table-column label="到达确认" width="180">
        <template #default="{ row }">{{ formatDateTime(row.arrived_confirmed_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleOpen(row)">打开文件</el-button>
          <el-button text :disabled="Boolean(row.arrived_confirmed_at)" @click="handleConfirmArrival(row)">确认到达货代</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="上传货代入库指示单" width="680px">
      <el-form label-width="110px">
        <el-form-item label="货代地址">
          <el-select v-model="form.freightAddressId" placeholder="请选择货代地址" style="width: 100%">
            <el-option v-for="item in freightAddresses" :key="item._id" :label="item.label" :value="item._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联发货单">
          <el-select v-model="form.shipmentOrderIds" multiple placeholder="可多选" style="width: 100%">
            <el-option
              v-for="item in freightShipments"
              :key="item._id"
              :label="`${item.shipment_no} · ${item.shipper_name} → ${item.to_address_label}`"
              :value="item._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="文件">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" @change="handleFileChange" />
          <div class="upload-tip">{{ selectedFile?.name || '未选择文件' }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchFreightDocuments, createFreightDocument, confirmFreightArrival } from '../../services/freight'
import { fetchShipmentList } from '../../services/shipment'
import { fetchAddressList } from '../../services/address'
import { getTempFileURLs, uploadCloudFile } from '../../services/cloudbase'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const rows = ref([])
const freightShipments = ref([])
const freightAddresses = ref([])
const selectedFile = ref(null)
const form = ref({
  freightAddressId: '',
  shipmentOrderIds: []
})

async function loadData() {
  loading.value = true
  try {
    const [documentResult, shipmentResult, addressResult] = await Promise.all([
      fetchFreightDocuments(),
      fetchShipmentList({ page: 1, pageSize: 100 }),
      fetchAddressList({ page: 1, pageSize: 100, type: 'freight' })
    ])
    rows.value = documentResult.list || []
    freightShipments.value = (shipmentResult.list || []).filter(item => item.destination_type === 'freight')
    freightAddresses.value = addressResult.list || []
  } catch (error) {
    ElMessage.error(error.message || '加载货代单据失败')
  } finally {
    loading.value = false
  }
}

function openDialog() {
  selectedFile.value = null
  form.value = {
    freightAddressId: freightAddresses.value[0]?._id || '',
    shipmentOrderIds: []
  }
  dialogVisible.value = true
}

function handleFileChange(event) {
  selectedFile.value = event.target.files?.[0] || null
}

async function handleCreate() {
  if (!form.value.freightAddressId) {
    ElMessage.warning('请选择货代地址')
    return
  }
  if (!selectedFile.value) {
    ElMessage.warning('请选择待上传文件')
    return
  }

  submitting.value = true
  try {
    const safeName = selectedFile.value.name.replace(/[^\w.-]+/g, '_')
    const uploadResult = await uploadCloudFile({
      cloudPath: `freight/${Date.now()}_${safeName}`,
      file: selectedFile.value
    })
    await createFreightDocument({
      fileId: uploadResult.fileID || uploadResult.fileId,
      fileName: selectedFile.value.name,
      freightAddressId: form.value.freightAddressId,
      shipmentOrderIds: form.value.shipmentOrderIds
    })
    ElMessage.success('货代单据已上传')
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '上传货代单据失败')
  } finally {
    submitting.value = false
  }
}

async function handleOpen(row) {
  if (!row.file_id) return
  try {
    const result = await getTempFileURLs([row.file_id])
    const tempUrl = result.fileList?.[0]?.tempFileURL
    if (!tempUrl) {
      throw new Error('获取文件链接失败')
    }
    window.open(tempUrl, '_blank', 'noopener')
  } catch (error) {
    ElMessage.error(error.message || '打开文件失败')
  }
}

async function handleConfirmArrival(row) {
  try {
    await confirmFreightArrival(row._id)
    ElMessage.success('已确认到达货代')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '确认到达失败')
  }
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

.header-actions {
  display: flex;
  gap: 12px;
}

.upload-tip {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
