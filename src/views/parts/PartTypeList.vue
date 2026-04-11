<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 20px">
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
        <el-input
          v-model="keyword"
          placeholder="搜索配件名称 / 类别 / 供应商"
          prefix-icon="Search"
          clearable
          style="width: 320px"
          @input="debouncedSearch"
        />
        <el-select v-model="categoryFilter" placeholder="配件类别" clearable filterable style="width: 180px" @change="loadList">
          <el-option v-for="category in categoryOptions" :key="category" :label="category" :value="category" />
        </el-select>
        <el-select v-model="supplierFilter" placeholder="供应商" clearable filterable style="width: 240px" @change="loadList">
          <el-option v-for="supplier in suppliers" :key="supplier._id" :label="supplier.name" :value="supplier._id" />
        </el-select>
        <div style="flex: 1" />
        <el-button v-if="!bulkEditing" type="primary" @click="startBulkEdit">全量编辑</el-button>
        <template v-else>
          <el-button @click="cancelBulkEdit">取消全量编辑</el-button>
          <el-button type="success" :loading="bulkSaving" @click="saveBulkEdit">保存全量编辑</el-button>
        </template>
        <el-button type="primary" icon="Plus" @click="openCreateDialog">新增配件管理项</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <div style="font-size: 13px; color: var(--color-text-secondary)">
          配件管理是 BOM 的统一来源。产品详情里的 BOM 只维护“SKU 使用哪些配件、各多少件”。
        </div>
        <el-tag type="info">共 {{ list.length }} 项</el-tag>
      </div>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column label="配件类别" width="150">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.category" size="small" />
            <span v-else>{{ row.category }}</span>
          </template>
        </el-table-column>
        <el-table-column label="配件名称" min-width="220">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.name" size="small" />
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="材质" width="120">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.material" size="small" />
            <span v-else>{{ row.material || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="颜色" width="120">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.color" size="small" />
            <span v-else>{{ row.color || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="重量" width="120">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.weight" size="small" />
            <span v-else>{{ row.weight || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="尺寸" width="140">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.size" size="small" />
            <span v-else>{{ row.size || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="220">
          <template #default="{ row }">
            <el-select v-if="bulkEditing" v-model="row.supplier_org_id" filterable size="small" style="width: 100%">
              <el-option v-for="supplier in suppliers" :key="supplier._id" :label="supplier.name" :value="supplier._id" />
            </el-select>
            <span v-else>{{ row.supplier_org_name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="单位" width="100" align="center">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.unit" size="small" />
            <span v-else>{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="参考单价" width="140" align="right">
          <template #default="{ row }">
            <el-input-number v-if="bulkEditing" v-model="row.unit_price" :min="0" :precision="2" :step="0.5" size="small" style="width: 110px" />
            <span v-else>{{ formatPrice(row.unit_price) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="价格备注" min-width="180">
          <template #default="{ row }">
            <el-input v-if="bulkEditing" v-model="row.price_note" size="small" />
            <span v-else>{{ row.price_note || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center">
          <template #default="{ row }">
            <template v-if="!bulkEditing">
              <el-button text type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
            <span v-else style="color: var(--color-text-muted)">全量编辑中</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && list.length === 0" description="暂无配件管理数据" />
    </el-card>

    <el-dialog v-model="showDialog" :title="dialogTitle" width="620px" @closed="resetForm">
      <el-form :model="form" label-width="110px">
        <el-form-item label="配件类别" required>
          <el-select
            v-model="form.category"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="如：垫子 / 铁架套装 / 吸盘"
            style="width: 100%"
          >
            <el-option v-for="category in categoryOptions" :key="category" :label="category" :value="category" />
          </el-select>
        </el-form-item>
        <el-form-item label="配件名称" required>
          <el-input v-model="form.name" placeholder="如：01-白色" />
        </el-form-item>
        <el-form-item label="供应商" required>
          <el-select v-model="form.supplier_org_id" filterable placeholder="请选择供应商" style="width: 100%">
            <el-option v-for="supplier in suppliers" :key="supplier._id" :label="supplier.name" :value="supplier._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="计量单位">
          <el-input v-model="form.unit" placeholder="默认：件" />
        </el-form-item>
        <el-form-item label="参考单价">
          <el-input-number v-model="form.unit_price" :min="0" :precision="2" :step="0.5" style="width: 100%" />
        </el-form-item>
        <el-form-item label="价格备注">
          <el-input v-model="form.price_note" type="textarea" :rows="3" placeholder="如：2026 年 4 月调价" />
        </el-form-item>
        <el-form-item label="材质">
          <el-input v-model="form.material" placeholder="如：牛津布 / 铁 / 实木" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-input v-model="form.color" placeholder="如：灰色 / 黑色" />
        </el-form-item>
        <el-form-item label="重量">
          <el-input v-model="form.weight" placeholder="如：350g / 1.2kg" />
        </el-form-item>
        <el-form-item label="尺寸">
          <el-input v-model="form.size" placeholder="如：40x30cm" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="savePartType">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchOrgList } from '../../services/organization'
import { bulkUpdatePartTypes, createPartType, deletePartType, fetchPartTypeList, updatePartType } from '../../services/partType'

const loading = ref(false)
const saving = ref(false)
const showDialog = ref(false)
const dialogMode = ref('create')
const editingId = ref('')
const list = ref([])
const draftList = ref([])
const categoryCatalog = ref([])
const suppliers = ref([])
const keyword = ref('')
const categoryFilter = ref('')
const supplierFilter = ref('')
const bulkEditing = ref(false)
const bulkSaving = ref(false)

const form = reactive({
  category: '',
  name: '',
  supplier_org_id: '',
  unit: '件',
  unit_price: null,
  price_note: '',
  material: '',
  color: '',
  weight: '',
  size: ''
})

const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增配件管理项' : '编辑配件管理项'))
const categoryOptions = computed(() => [...new Set(categoryCatalog.value)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN')))
const tableData = computed(() => (bulkEditing.value ? draftList.value : list.value))

let searchTimer = null

function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(), 300)
}

function resetForm() {
  editingId.value = ''
  form.category = ''
  form.name = ''
  form.supplier_org_id = ''
  form.unit = '件'
  form.unit_price = null
  form.price_note = ''
  form.material = ''
  form.color = ''
  form.weight = ''
  form.size = ''
}

function openCreateDialog() {
  dialogMode.value = 'create'
  resetForm()
  showDialog.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingId.value = row._id
  form.category = row.category || ''
  form.name = row.name || ''
  form.supplier_org_id = row.supplier_org_id || ''
  form.unit = row.unit || '件'
  form.unit_price = row.unit_price ?? null
  form.price_note = row.price_note || ''
  form.material = row.material || ''
  form.color = row.color || ''
  form.weight = row.weight || ''
  form.size = row.size || ''
  showDialog.value = true
}

async function loadSuppliers() {
  try {
    const result = await fetchOrgList({ page: 1, pageSize: 200, cooperation_status: 'active' })
    suppliers.value = result.list || []
  } catch (error) {
    console.error('Failed to load suppliers:', error)
    suppliers.value = []
  }
}

async function loadCategoryCatalog() {
  try {
    const result = await fetchPartTypeList({ page: 1, pageSize: 500 })
    categoryCatalog.value = (result.list || []).map(item => item.category)
  } catch (error) {
    console.error('Failed to load part type catalog:', error)
    categoryCatalog.value = []
  }
}

async function loadList() {
  loading.value = true
  try {
    const params = { page: 1, pageSize: 500 }
    if (keyword.value) params.keyword = keyword.value
    if (categoryFilter.value) params.category = categoryFilter.value
    if (supplierFilter.value) params.supplier_org_id = supplierFilter.value
    const result = await fetchPartTypeList(params)
    list.value = result.list || []
    draftList.value = JSON.parse(JSON.stringify(list.value))
  } catch (error) {
    console.error('Failed to load part types:', error)
    list.value = []
    draftList.value = []
  } finally {
    loading.value = false
  }
}

function startBulkEdit() {
  draftList.value = JSON.parse(JSON.stringify(list.value))
  bulkEditing.value = true
}

function cancelBulkEdit() {
  bulkEditing.value = false
  draftList.value = JSON.parse(JSON.stringify(list.value))
}

async function saveBulkEdit() {
  bulkSaving.value = true
  try {
    await bulkUpdatePartTypes(draftList.value.map(item => ({
      id: item._id,
      category: item.category,
      name: item.name,
      supplier_org_id: item.supplier_org_id,
      unit: item.unit,
      unit_price: item.unit_price,
      price_note: item.price_note,
      material: item.material,
      color: item.color,
      weight: item.weight,
      size: item.size
    })))
    ElMessage.success('配件管理已批量更新')
    bulkEditing.value = false
    await Promise.all([loadList(), loadCategoryCatalog()])
  } catch (error) {
    ElMessage.error(error.message || '批量保存失败')
  } finally {
    bulkSaving.value = false
  }
}

async function savePartType() {
  if (!form.category.trim() || !form.name.trim() || !form.supplier_org_id) {
    ElMessage.warning('请填写配件类别、配件名称和供应商')
    return
  }

  saving.value = true
  try {
    const payload = {
      category: form.category.trim(),
      name: form.name.trim(),
      supplier_org_id: form.supplier_org_id,
      unit: form.unit.trim(),
      unit_price: form.unit_price,
      price_note: form.price_note.trim(),
      material: form.material.trim(),
      color: form.color.trim(),
      weight: form.weight.trim(),
      size: form.size.trim()
    }

    if (dialogMode.value === 'create') {
      await createPartType(payload)
      ElMessage.success('配件管理项已创建')
    } else {
      await updatePartType(editingId.value, payload)
      ElMessage.success('配件管理项已更新')
    }

    showDialog.value = false
    await Promise.all([loadList(), loadCategoryCatalog()])
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除配件管理项「${row.category} / ${row.name}」吗？`,
      '删除配件管理项',
      { type: 'warning' }
    )
    await deletePartType(row._id)
    ElMessage.success('配件管理项已删除')
    await Promise.all([loadList(), loadCategoryCatalog()])
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function formatPrice(value) {
  return value === null || value === undefined ? '-' : `¥ ${Number(value).toFixed(2)}`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

onMounted(async () => {
  await Promise.all([loadSuppliers(), loadCategoryCatalog(), loadList()])
})
</script>
