<template>
  <div>
    <!-- 筛选栏 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <div style="display: flex; gap: 16px; align-items: center">
        <el-input v-model="keyword" placeholder="搜索公司名称 / 信用代码" prefix-icon="Search" clearable style="width: 320px" @input="debouncedSearch" />
        <el-select v-model="statusFilter" placeholder="合作状态" clearable style="width: 140px" @change="loadList">
          <el-option label="合作中" value="active" />
          <el-option label="已停止" value="stopped" />
        </el-select>
        <div style="flex: 1" />
        <el-button type="primary" icon="Plus" @click="showCreateDialog = true">新增供应商</el-button>
      </div>
    </el-card>

    <!-- 供应商表格 -->
    <el-card shadow="never">
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="name" label="公司名称" min-width="240">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="goToDetail(row._id)" style="font-weight: 600">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="credit_code" label="统一社会信用代码" width="220">
          <template #default="{ row }">
            <code style="font-size: 12px">{{ row.credit_code }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="legal_person" label="企业法人" width="100" />
        <el-table-column label="组装能力" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.has_assembly" type="success" size="small">有</el-tag>
            <el-tag v-else type="info" size="small">无</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cooperation_note" label="合作说明" min-width="280" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.cooperation_status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.cooperation_status === 'active' ? '合作中' : '已停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="goToDetail(row._id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增供应商对话框 -->
    <el-dialog v-model="showCreateDialog" title="新增供应商" width="500px">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="公司名称" required>
          <el-input v-model="createForm.name" />
        </el-form-item>
        <el-form-item label="信用代码">
          <el-input v-model="createForm.credit_code" />
        </el-form-item>
        <el-form-item label="法人姓名">
          <el-input v-model="createForm.legal_person" />
        </el-form-item>
        <el-form-item label="组装能力">
          <el-switch v-model="createForm.has_assembly" />
        </el-form-item>
        <el-form-item label="合作说明">
          <el-input v-model="createForm.cooperation_note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchOrgList, createOrg } from '../../services/organization'

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const list = ref([])
const keyword = ref('')
const statusFilter = ref('')
const showCreateDialog = ref(false)
const createForm = ref({ name: '', credit_code: '', legal_person: '', has_assembly: false, cooperation_note: '' })

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
    if (statusFilter.value) params.cooperation_status = statusFilter.value
    const result = await fetchOrgList(params)
    list.value = result.list || []
  } catch (e) {
    console.error('Failed to load organizations:', e)
    list.value = []
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.value.name) {
    ElMessage.warning('请填写公司名称')
    return
  }
  creating.value = true
  try {
    await createOrg(createForm.value)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    createForm.value = { name: '', credit_code: '', legal_person: '', has_assembly: false, cooperation_note: '' }
    loadList()
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

function goToDetail(id) {
  router.push(`/suppliers/${id}`)
}

onMounted(() => {
  loadList()
})
</script>
