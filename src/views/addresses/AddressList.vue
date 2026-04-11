<template>
  <div>
    <!-- 筛选栏 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <div style="display: flex; gap: 16px; align-items: center">
        <el-input v-model="keyword" placeholder="搜索地址名称 / 详细地址 / 联系人" prefix-icon="Search" clearable style="width: 320px" @input="debouncedSearch" />
        <el-select v-if="!isTypeLocked" v-model="typeFilter" placeholder="地址类型" clearable style="width: 140px" @change="loadList">
          <el-option label="工厂" value="factory" />
          <el-option label="组装厂" value="assembly" />
          <el-option label="货代" value="freight" />
        </el-select>
        <div style="flex: 1" />
        <el-button type="primary" icon="Plus" @click="openCreate">新增{{ dialogEntityLabel }}</el-button>
      </div>
    </el-card>

    <!-- 地址表格 -->
    <el-card shadow="never">
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column v-if="!isTypeLocked" prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTag[row.type]" size="small">{{ typeLabel[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="地址名称" width="180" />
        <el-table-column prop="org_name" label="所属组织" width="180">
          <template #default="{ row }">{{ row.org_name || '平台/货代' }}</template>
        </el-table-column>
        <el-table-column label="详细地址" min-width="300">
          <template #default="{ row }">
            {{ [row.province, row.city, row.district, row.detail].filter(Boolean).join('') }}
          </template>
        </el-table-column>
        <el-table-column prop="contact_name" label="联系人" width="100" />
        <el-table-column prop="contact_phone" label="联系电话" width="130" />
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" text size="small" @click="handleDelete(row._id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && list.length === 0" :description="emptyDescription" />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="form._id ? `编辑${dialogEntityLabel}` : `新增${dialogEntityLabel}`" width="550px">
      <el-form :model="form" label-width="100px">
        <el-form-item v-if="!isTypeLocked" label="地址类型" required>
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="工厂地址" value="factory" />
            <el-option label="组装厂地址" value="assembly" />
            <el-option label="货代地址" value="freight" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址名称" required>
          <el-input v-model="form.label" placeholder="如：浦江旺钰工厂、宁波柯诚组装厂" />
        </el-form-item>
        <el-form-item label="所属组织">
          <el-input v-model="form.org_name" placeholder="留空表示平台/货代地址" />
        </el-form-item>
        <el-form-item label="省">
          <el-input v-model="form.province" />
        </el-form-item>
        <el-form-item label="市">
          <el-input v-model="form.city" />
        </el-form-item>
        <el-form-item label="区/县">
          <el-input v-model="form.district" />
        </el-form-item>
        <el-form-item label="详细地址" required>
          <el-input v-model="form.detail" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact_name" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contact_phone" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="formSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAddressList, createAddress, updateAddress, deleteAddress } from '../../services/address'

const route = useRoute()
const loading = ref(false)
const formSaving = ref(false)
const list = ref([])
const keyword = ref('')
const typeFilter = ref('')
const showDialog = ref(false)

const emptyForm = { type: 'factory', label: '', org_id: null, org_name: '', province: '', city: '', district: '', detail: '', contact_name: '', contact_phone: '' }
const form = ref({ ...emptyForm })

const typeLabel = { factory: '工厂', assembly: '组装厂', freight: '货代' }
const typeTag = { factory: '', assembly: 'warning', freight: 'info' }
const lockedType = computed(() => route.meta.addressType || '')
const isTypeLocked = computed(() => Boolean(lockedType.value))
const dialogEntityLabel = computed(() => {
  if (lockedType.value === 'freight') {
    return '货代地址'
  }
  return '地址'
})
const emptyDescription = computed(() => {
  if (lockedType.value === 'freight') {
    return '暂无货代地址'
  }
  return '暂无地址数据'
})

let searchTimer = null
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(), 300)
}

async function loadList() {
  loading.value = true
  try {
    const params = { page: 1, pageSize: 100 }
    if (keyword.value) params.keyword = keyword.value
    if (lockedType.value) {
      params.type = lockedType.value
    } else if (typeFilter.value) {
      params.type = typeFilter.value
    }
    const result = await fetchAddressList(params)
    list.value = result.list || []
  } catch (e) {
    console.error('Failed to load addresses:', e)
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { ...emptyForm, type: lockedType.value || emptyForm.type }
  showDialog.value = true
}

function openEdit(row) {
  form.value = { ...row, type: lockedType.value || row.type || emptyForm.type }
  showDialog.value = true
}

async function handleSave() {
  if (lockedType.value) {
    form.value.type = lockedType.value
  }
  if (!form.value.type || !form.value.label || !form.value.detail) {
    ElMessage.warning('请填写必填字段')
    return
  }
  formSaving.value = true
  try {
    if (form.value._id) {
      await updateAddress(form.value._id, form.value)
    } else {
      await createAddress(form.value)
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    loadList()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    formSaving.value = false
  }
}

async function handleDelete(id) {
  await ElMessageBox.confirm('确定删除该地址？', '提示', { type: 'warning' })
  try {
    await deleteAddress(id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  if (lockedType.value) {
    typeFilter.value = lockedType.value
  }
  loadList()
})

watch(lockedType, (value) => {
  typeFilter.value = value || ''
  if (!showDialog.value) {
    form.value = { ...emptyForm, type: value || emptyForm.type }
  }
  loadList()
})
</script>
