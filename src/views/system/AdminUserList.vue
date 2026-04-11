<template>
  <div class="admin-user-page">
    <div class="page-header">
      <div>
        <h2>甲方权限管理</h2>
        <p class="page-hint">为甲方成员分配模块权限。第三方质检人员可只授权“质检管理”。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增甲方成员</el-button>
    </div>

    <el-table :data="rows" border v-loading="loading">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="role_name" label="身份" width="140" />
      <el-table-column label="模块权限" min-width="320">
        <template #default="{ row }">{{ summarizePermissions(row.permissions) }}</template>
      </el-table-column>
      <el-table-column label="最后登录" width="170">
        <template #default="{ row }">{{ formatDateTime(row.last_login_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button text type="primary" @click="openEditDialog(row)">编辑权限</el-button>
          <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showDialog" :title="editingUser ? '编辑甲方成员' : '新增甲方成员'" width="640px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" :disabled="Boolean(editingUser)" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="form.phone" :disabled="Boolean(editingUser)" />
        </el-form-item>
        <el-form-item label="身份模板" required>
          <el-select v-model="form.rolePreset" style="width: 100%" @change="handleRolePresetChange">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="甲方管理员" value="admin" />
            <el-option label="甲方跟单员" value="merchandiser" />
            <el-option label="甲方质检员 / 第三方质检" value="quality_only" />
          </el-select>
        </el-form-item>
        <el-form-item label="显示身份">
          <el-input v-model="form.role_name" />
        </el-form-item>
        <el-form-item label="模块权限">
          <el-checkbox-group v-model="form.permissionKeys" :disabled="form.rolePreset === 'super_admin'">
            <div class="permission-grid">
              <el-checkbox v-for="item in permissionOptions" :key="item.key" :label="item.key">
                {{ item.label }}
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ADMIN_PERMISSION_OPTIONS } from '../../constants/adminPermissions'
import { createAdminUser, deleteAdminUser, fetchAdminUserList, updateAdminUserPermissions } from '../../services/adminUser'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const showDialog = ref(false)
const editingUser = ref(null)
const permissionOptions = ADMIN_PERMISSION_OPTIONS
const emptyForm = () => ({
  name: '',
  phone: '',
  rolePreset: 'admin',
  role: 'admin',
  role_name: '甲方管理员',
  permissionKeys: permissionOptions.map((item) => item.key)
})
const form = ref(emptyForm())

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const result = await fetchAdminUserList()
    rows.value = result.list || []
  } catch (error) {
    ElMessage.error(error.message || '加载甲方成员失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingUser.value = null
  form.value = emptyForm()
  showDialog.value = true
}

function openEditDialog(row) {
  editingUser.value = row
  const permissionKeys = (row.permissions || [])
    .filter((item) => item.granted && item.permission_key !== '*')
    .map((item) => item.permission_key)
  form.value = {
    name: row.name || '',
    phone: row.phone || '',
    rolePreset: row.role === 'super_admin' ? 'super_admin' : inferRolePreset(row),
    role: row.role || 'admin',
    role_name: row.role_name || '',
    permissionKeys
  }
  showDialog.value = true
}

function inferRolePreset(row) {
  const granted = new Set((row.permissions || []).filter((item) => item.granted).map((item) => item.permission_key))
  if (granted.size === 1 && granted.has('module_quality')) {
    return 'quality_only'
  }
  return row.role || 'admin'
}

function handleRolePresetChange(value) {
  if (value === 'super_admin') {
    form.value.role = 'super_admin'
    form.value.role_name = '超级管理员'
    form.value.permissionKeys = permissionOptions.map((item) => item.key)
    return
  }

  if (value === 'quality_only') {
    form.value.role = 'admin'
    form.value.role_name = '甲方质检员'
    form.value.permissionKeys = ['module_quality']
    return
  }

  if (value === 'merchandiser') {
    form.value.role = 'merchandiser'
    form.value.role_name = '甲方跟单员'
    form.value.permissionKeys = ['module_contract', 'module_shipment', 'module_freight', 'module_notification']
    return
  }

  form.value.role = 'admin'
  form.value.role_name = '甲方管理员'
  form.value.permissionKeys = permissionOptions.map((item) => item.key)
}

async function handleSubmit() {
  if (!form.value.name || !form.value.phone) {
    ElMessage.warning('请先填写姓名和手机号')
    return
  }

  saving.value = true
  try {
    if (editingUser.value) {
      await updateAdminUserPermissions({
        userId: editingUser.value._id,
        role: form.value.role,
        role_name: form.value.role_name,
        permissions: form.value.permissionKeys
      })
    } else {
      await createAdminUser({
        name: form.value.name,
        phone: form.value.phone,
        role: form.value.role,
        role_name: form.value.role_name,
        permissions: form.value.permissionKeys
      })
    }
    ElMessage.success('保存成功')
    showDialog.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除 ${row.name} 吗？`, '提示', { type: 'warning' })
  try {
    await deleteAdminUser(row._id)
    ElMessage.success('已删除')
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '删除失败')
  }
}

function summarizePermissions(permissions = []) {
  if ((permissions || []).some((item) => item.permission_key === '*')) {
    return '全部权限'
  }

  const granted = new Set((permissions || []).filter((item) => item.granted).map((item) => item.permission_key))
  return permissionOptions
    .filter((item) => granted.has(item.key))
    .map((item) => item.label)
    .join('、') || '未分配模块'
}

function formatDateTime(value) {
  if (!value) return '未登录'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}

.page-header h2 {
  margin: 0;
}

.page-hint {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}
</style>
