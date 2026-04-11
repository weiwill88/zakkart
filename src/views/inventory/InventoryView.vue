<template>
  <div class="inventory-page">
    <div class="page-header">
      <div>
        <h2>库存管理</h2>
        <p class="page-hint">当前第一版只维护组装厂库存，支持甲方人工初始化与更新配件/成品库存。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增库存项</el-button>
    </div>

    <div class="summary-grid">
      <el-card shadow="never">
        <div class="summary-label">配件库存项</div>
        <div class="summary-value">{{ summary.totalPartItems || 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="summary-label">成品库存项</div>
        <div class="summary-value">{{ summary.totalProductItems || 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="summary-label">在制品总量</div>
        <div class="summary-value">{{ formatNumber(summary.totalWipQty) }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="summary-label">半成品总量</div>
        <div class="summary-value">{{ formatNumber(summary.totalSemiQty) }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="summary-label">成品总量</div>
        <div class="summary-value">{{ formatNumber(summary.totalFinishedQty) }}</div>
      </el-card>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select v-model="filters.orgId" clearable placeholder="选择组装厂" style="width: 220px" @change="loadData">
          <el-option v-for="item in assemblyOrgs" :key="item._id" :label="item.name" :value="item._id" />
        </el-select>
        <el-select v-model="filters.itemType" clearable placeholder="库存类型" style="width: 140px" @change="loadData">
          <el-option label="配件库存" value="part" />
          <el-option label="成品库存" value="product" />
        </el-select>
        <el-input v-model="filters.keyword" placeholder="搜索组装厂 / 库存项" style="width: 260px" @keyup.enter="loadData" />
        <el-button @click="loadData">搜索</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header><span class="section-title">库存明细</span></template>
      <el-table :data="rows" border v-loading="loading">
        <el-table-column prop="org_name" label="组装厂" width="180" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ row.item_type === 'part' ? '配件' : '成品' }}</template>
        </el-table-column>
        <el-table-column prop="item_name" label="库存项" min-width="240" />
        <el-table-column label="在制品" width="100" align="right">
          <template #default="{ row }">{{ formatNumber(row.wip_qty) }}</template>
        </el-table-column>
        <el-table-column label="半成品" width="100" align="right">
          <template #default="{ row }">{{ formatNumber(row.semi_qty) }}</template>
        </el-table-column>
        <el-table-column label="成品" width="100" align="right">
          <template #default="{ row }">{{ formatNumber(row.finished_qty) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button text type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button text @click="openHistoryDialog(row)">历史</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && rows.length === 0" description="当前没有库存数据，可先手动录入组装厂库存" />
    </el-card>

    <el-card shadow="never" class="log-card">
      <template #header><span class="section-title">最近库存流水</span></template>
      <el-table :data="logs" border size="small">
        <el-table-column prop="org_name" label="组装厂" width="160" />
        <el-table-column prop="item_name" label="库存项" min-width="220" />
        <el-table-column prop="stock_field" label="字段" width="100">
          <template #default="{ row }">{{ stockFieldLabel(row.stock_field) }}</template>
        </el-table-column>
        <el-table-column label="变更量" width="100" align="right">
          <template #default="{ row }">{{ signedNumber(row.change_qty) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="220" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="logs.length === 0" description="暂无库存流水" />
    </el-card>

    <el-dialog v-model="showDialog" :title="editingRow ? '编辑库存项' : '新增库存项'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="组装厂" required>
          <el-select v-model="form.orgId" style="width: 100%" :disabled="Boolean(editingRow)">
            <el-option v-for="item in assemblyOrgs" :key="item._id" :label="item.name" :value="item._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存类型" required>
          <el-radio-group v-model="form.itemType" :disabled="Boolean(editingRow)">
            <el-radio label="part">配件</el-radio>
            <el-radio label="product">成品</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.itemType === 'part'" label="配件" required>
          <el-select v-model="form.partTypeId" filterable style="width: 100%" :disabled="Boolean(editingRow)">
            <el-option v-for="item in partOptions" :key="item._id" :label="item.name" :value="item._id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="SKU" required>
          <el-select v-model="form.skuId" filterable style="width: 100%" :disabled="Boolean(editingRow)">
            <el-option v-for="item in skuOptions" :key="item.sku_id" :label="item.label" :value="item.sku_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="在制品">
          <el-input-number v-model="form.wipQty" :min="0" :step="10" style="width: 180px" />
        </el-form-item>
        <el-form-item label="半成品">
          <el-input-number v-model="form.semiQty" :min="0" :step="10" style="width: 180px" />
        </el-form-item>
        <el-form-item label="成品">
          <el-input-number v-model="form.finishedQty" :min="0" :step="10" style="width: 180px" />
        </el-form-item>
        <el-form-item label="调整原因" required>
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请写明这次初始化/调整的原因，该记录会进入库存历史" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showHistoryDialog" title="库存调整历史" width="760px">
      <el-empty v-if="historyLoading === false && historyRows.length === 0" description="暂无库存调整记录" />
      <el-table v-else :data="historyRows" border size="small" v-loading="historyLoading">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="字段" width="100">
          <template #default="{ row }">{{ stockFieldLabel(row.stock_field) }}</template>
        </el-table-column>
        <el-table-column label="变更量" width="100" align="right">
          <template #default="{ row }">{{ signedNumber(row.change_qty) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="260" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchInventoryHistory, fetchInventoryOverview, upsertInventoryItem } from '../../services/inventory'
import { fetchOrgList } from '../../services/organization'
import { fetchPartTypeList } from '../../services/partType'
import { fetchProductList } from '../../services/product'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const logs = ref([])
const summary = ref({})
const assemblyOrgs = ref([])
const partOptions = ref([])
const products = ref([])
const showDialog = ref(false)
const editingRow = ref(null)
const showHistoryDialog = ref(false)
const historyLoading = ref(false)
const historyRows = ref([])
const filters = ref({
  orgId: '',
  itemType: '',
  keyword: ''
})
const form = ref(getEmptyForm())

const skuOptions = computed(() => (
  products.value.flatMap((product) => (product.skus || []).map((sku) => ({
    sku_id: sku.sku_id,
    label: `${product.name_cn || product.code || '产品'} · ${sku.spec || sku.sku_id}`
  })))
))

onMounted(async () => {
  await loadOptions()
  await loadData()
})

async function loadOptions() {
  try {
    const [orgResult, partResult, productResult] = await Promise.all([
      fetchOrgList({ page: 1, pageSize: 200 }),
      fetchPartTypeList({ page: 1, pageSize: 500 }),
      fetchProductList({ page: 1, pageSize: 200 })
    ])

    assemblyOrgs.value = (orgResult.list || []).filter((item) => item.has_assembly)
    partOptions.value = partResult.list || []
    products.value = productResult.list || []
  } catch (error) {
    ElMessage.error(error.message || '加载库存选项失败')
  }
}

async function loadData() {
  loading.value = true
  try {
    const result = await fetchInventoryOverview(filters.value)
    rows.value = result.list || []
    logs.value = result.logs || []
    summary.value = result.summary || {}
    if ((result.assemblyOrgs || []).length > 0) {
      assemblyOrgs.value = result.assemblyOrgs
    }
  } catch (error) {
    ElMessage.error(error.message || '加载库存失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingRow.value = null
  form.value = getEmptyForm()
  showDialog.value = true
}

function openEditDialog(row) {
  editingRow.value = row
  form.value = {
    id: row._id,
    orgId: row.org_id,
    itemType: row.item_type,
    partTypeId: row.part_type_id || '',
    skuId: row.sku_id || '',
    wipQty: Number(row.wip_qty || 0),
    semiQty: Number(row.semi_qty || 0),
    finishedQty: Number(row.finished_qty || 0),
    reason: ''
  }
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.orgId) {
    ElMessage.warning('请选择组装厂')
    return
  }
  if (form.value.itemType === 'part' && !form.value.partTypeId) {
    ElMessage.warning('请选择配件')
    return
  }
  if (form.value.itemType === 'product' && !form.value.skuId) {
    ElMessage.warning('请选择 SKU')
    return
  }
  if (!String(form.value.reason || '').trim()) {
    ElMessage.warning('请填写本次库存调整原因')
    return
  }

  saving.value = true
  try {
    await upsertInventoryItem(form.value)
    ElMessage.success('库存已保存')
    showDialog.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存库存失败')
  } finally {
    saving.value = false
  }
}

async function openHistoryDialog(row) {
  showHistoryDialog.value = true
  historyLoading.value = true
  historyRows.value = []
  try {
    const result = await fetchInventoryHistory(row._id)
    historyRows.value = result.list || []
  } catch (error) {
    ElMessage.error(error.message || '加载库存历史失败')
  } finally {
    historyLoading.value = false
  }
}

function getEmptyForm() {
  return {
    id: '',
    orgId: '',
    itemType: 'part',
    partTypeId: '',
    skuId: '',
    wipQty: 0,
    semiQty: 0,
    finishedQty: 0,
    reason: ''
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function signedNumber(value) {
  const number = Number(value || 0)
  return `${number > 0 ? '+' : ''}${number.toLocaleString()}`
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

function stockFieldLabel(value) {
  if (value === 'wip_qty') return '在制品'
  if (value === 'semi_qty') return '半成品'
  if (value === 'finished_qty') return '成品'
  return '-'
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
}

.page-hint {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.log-card {
  margin-top: 16px;
}
</style>
