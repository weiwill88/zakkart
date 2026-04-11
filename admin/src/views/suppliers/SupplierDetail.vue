<template>
  <div v-loading="loading">
    <div v-if="org">
      <el-page-header @back="goBack" style="margin-bottom: 24px">
        <template #content>
          <span style="font-size: 18px; font-weight: 600">{{ org.name }}</span>
          <el-tag :type="org.cooperation_status === 'active' ? 'success' : 'danger'" size="small" style="margin-left: 12px">
            {{ org.cooperation_status === 'active' ? '合作中' : '已停止' }}
          </el-tag>
          <el-tag v-if="org.has_assembly" type="warning" size="small" style="margin-left: 8px">组装厂</el-tag>
        </template>
      </el-page-header>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- Tab 1: 基本信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-form :model="editForm" label-width="140px" style="max-width: 700px; margin-top: 16px">
            <el-form-item label="公司名称">
              <el-input v-model="editForm.name" :disabled="!editing" />
            </el-form-item>
            <el-form-item label="统一社会信用代码">
              <el-input v-model="editForm.credit_code" :disabled="!editing" />
            </el-form-item>
            <el-form-item label="法人姓名">
              <el-input v-model="editForm.legal_person" :disabled="!editing" />
            </el-form-item>
            <el-form-item label="组装能力">
              <el-switch v-model="editForm.has_assembly" :disabled="!editing" />
            </el-form-item>
            <el-form-item label="合作状态">
              <el-select v-model="editForm.cooperation_status" :disabled="!editing" style="width: 100%">
                <el-option label="合作中" value="active" />
                <el-option label="已停止" value="stopped" />
              </el-select>
            </el-form-item>
            <el-form-item label="合作说明">
              <el-input v-model="editForm.cooperation_note" type="textarea" :rows="3" :disabled="!editing" />
            </el-form-item>

            <el-divider content-position="left">签约信息</el-divider>

            <el-form-item label="联系电话">
              <el-input v-model="editForm.contact_phone" :disabled="!editing" placeholder="合同中显示的联系方式" />
            </el-form-item>
            <el-form-item label="注册地址">
              <el-input v-model="editForm.address" :disabled="!editing" placeholder="合同中显示的公司地址" />
            </el-form-item>

            <el-divider content-position="left">银行信息</el-divider>

            <el-form-item label="开户银行">
              <el-input v-model="editForm.bank_info.bank_name" :disabled="!editing" placeholder="如：中国银行义乌分行" />
            </el-form-item>
            <el-form-item label="银行账号">
              <el-input v-model="editForm.bank_info.bank_account" :disabled="!editing" placeholder="银行卡号" />
            </el-form-item>
            <el-form-item label="开户行全称">
              <el-input v-model="editForm.bank_info.bank_branch" :disabled="!editing" placeholder="如：中国银行股份有限公司义乌稠州支行" />
            </el-form-item>

            <el-form-item>
              <el-button v-if="!editing" type="primary" @click="editing = true">编辑</el-button>
              <template v-else>
                <el-button @click="cancelEdit">取消</el-button>
                <el-button type="primary" @click="saveInfo" :loading="saving">保存</el-button>
              </template>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab 2: 地址管理 -->
        <el-tab-pane label="地址管理" name="address">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 16px">
            <el-button type="primary" icon="Plus" size="small" @click="showAddressDialog = true">新增地址</el-button>
          </div>
          <el-table :data="addresses" border stripe v-loading="addressLoading" size="small">
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="addressTypeTag[row.type]" size="small">{{ addressTypeLabel[row.type] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="label" label="地址名称" width="160" />
            <el-table-column label="详细地址" min-width="300">
              <template #default="{ row }">
                {{ [row.province, row.city, row.district, row.detail].filter(Boolean).join('') }}
              </template>
            </el-table-column>
            <el-table-column prop="contact_name" label="联系人" width="100" />
            <el-table-column prop="contact_phone" label="联系电话" width="130" />
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button type="primary" text size="small" @click="editAddress(row)">编辑</el-button>
                <el-button type="danger" text size="small" @click="handleDeleteAddress(row._id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!addressLoading && addresses.length === 0" description="暂无地址，请点击右上角新增" />

          <!-- 地址编辑对话框 -->
          <el-dialog v-model="showAddressDialog" :title="addressForm._id ? '编辑地址' : '新增地址'" width="500px">
            <el-form :model="addressForm" label-width="100px">
              <el-form-item label="地址类型" required>
                <el-select v-model="addressForm.type" style="width: 100%">
                  <el-option label="工厂地址" value="factory" />
                  <el-option label="组装厂地址" value="assembly" />
                </el-select>
              </el-form-item>
              <el-form-item label="地址名称" required>
                <el-input v-model="addressForm.label" placeholder="如：浦江旺钰工厂" />
              </el-form-item>
              <el-form-item label="省">
                <el-input v-model="addressForm.province" />
              </el-form-item>
              <el-form-item label="市">
                <el-input v-model="addressForm.city" />
              </el-form-item>
              <el-form-item label="区/县">
                <el-input v-model="addressForm.district" />
              </el-form-item>
              <el-form-item label="详细地址" required>
                <el-input v-model="addressForm.detail" type="textarea" :rows="2" />
              </el-form-item>
              <el-form-item label="联系人">
                <el-input v-model="addressForm.contact_name" />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="addressForm.contact_phone" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="showAddressDialog = false">取消</el-button>
              <el-button type="primary" @click="saveAddress" :loading="addressSaving">保存</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <!-- Tab 3: 联系人/成员 -->
        <el-tab-pane label="联系人/成员" name="members">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 16px">
            <el-button type="primary" icon="Plus" size="small" @click="showMemberDialog = true">添加成员</el-button>
          </div>
          <el-table :data="members" border stripe v-loading="memberLoading" size="small">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="phone" label="手机号" width="140" />
            <el-table-column prop="role" label="角色" width="120">
              <template #default="{ row }">
                <el-tag :type="row.role === 'supplier_owner' ? 'warning' : 'info'" size="small">
                  {{ row.role === 'supplier_owner' ? '负责人' : '成员' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最后登录" width="160">
              <template #default="{ row }">
                {{ row.last_login_at ? new Date(row.last_login_at).toLocaleString('zh-CN') : '未登录' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ row }">
                <el-button type="danger" text size="small" @click="handleDeleteMember(row._id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!memberLoading && members.length === 0" description="暂无成员" />

          <!-- 添加成员对话框 -->
          <el-dialog v-model="showMemberDialog" title="添加成员" width="400px">
            <el-form :model="memberForm" label-width="80px">
              <el-form-item label="姓名" required>
                <el-input v-model="memberForm.name" />
              </el-form-item>
              <el-form-item label="手机号" required>
                <el-input v-model="memberForm.phone" />
              </el-form-item>
              <el-form-item label="角色">
                <el-select v-model="memberForm.role" style="width: 100%">
                  <el-option label="负责人" value="supplier_owner" />
                  <el-option label="成员" value="supplier_member" />
                </el-select>
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="showMemberDialog = false">取消</el-button>
              <el-button type="primary" @click="handleAddMember" :loading="memberSaving">添加</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <el-tab-pane label="原材料管理" name="materials">
          <div style="display: flex; justify-content: flex-end; margin-bottom: 16px">
            <el-button type="primary" size="small" @click="addRawMaterial">新增原材料</el-button>
          </div>
          <el-table :data="rawMaterials" border stripe size="small">
            <el-table-column prop="name" label="原材料名称" min-width="220">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" />
              </template>
            </el-table-column>
            <el-table-column prop="note" label="备注" min-width="220">
              <template #default="{ row }">
                <el-input v-model="row.note" size="small" placeholder="如：用于垫子面料" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ $index }">
                <el-button text type="danger" size="small" @click="removeRawMaterial($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="rawMaterials.length === 0" description="暂无原材料配置" />
          <div style="margin-top: 16px; text-align: right">
            <el-button type="primary" :loading="rawMaterialSaving" @click="saveRawMaterials">保存原材料配置</el-button>
          </div>
        </el-tab-pane>

        <!-- Tab 5: 历史合同 -->
        <el-tab-pane label="历史合同" name="contracts">
          <el-empty description="暂无合同记录" />
        </el-tab-pane>

        <!-- Tab 6: 配件价格 -->
        <el-tab-pane label="配件价格" name="prices">
          <el-table :data="partPrices" border stripe v-loading="priceLoading" size="small">
            <el-table-column prop="name" label="配件名称" min-width="200" />
            <el-table-column prop="category" label="配件类别" width="120" />
            <el-table-column prop="unit" label="计量单位" width="80" align="center" />
            <el-table-column label="参考单价（元）" width="160">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.unit_price"
                  :min="0"
                  :precision="2"
                  :step="0.5"
                  size="small"
                  controls-position="right"
                  style="width: 130px"
                  @change="(val) => handlePriceChange(row._id, val)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="price_note" label="价格备注" min-width="200">
              <template #default="{ row }">
                <el-input v-model="row.price_note" size="small" placeholder="备注" @change="handlePriceNoteChange(row._id, row.price_note)" />
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!priceLoading && partPrices.length === 0" description="该供应商暂无关联配件" />
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-empty v-if="!loading && !org" description="供应商不存在">
      <el-button type="primary" @click="goBack">返回列表</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchOrgDetail, updateOrg, fetchMembers, addMember, deleteMember, fetchPartPrices, updatePartPrice, fetchRawMaterials, updateRawMaterials } from '../../services/organization'
import { fetchAddressList, createAddress, updateAddress, deleteAddress } from '../../services/address'

const route = useRoute()
const router = useRouter()
const orgId = route.params.id

// Main
const loading = ref(false)
const org = ref(null)
const activeTab = ref('info')

// Info tab
const editing = ref(false)
const saving = ref(false)
const editForm = ref({ bank_info: {} })

// Address tab
const addresses = ref([])
const addressLoading = ref(false)
const addressSaving = ref(false)
const showAddressDialog = ref(false)
const addressForm = ref({ type: 'factory', label: '', province: '', city: '', district: '', detail: '', contact_name: '', contact_phone: '' })
const addressTypeLabel = { factory: '工厂', assembly: '组装厂', freight: '货代' }
const addressTypeTag = { factory: '', assembly: 'warning', freight: 'info' }

// Member tab
const members = ref([])
const memberLoading = ref(false)
const memberSaving = ref(false)
const showMemberDialog = ref(false)
const memberForm = ref({ name: '', phone: '', role: 'supplier_member' })

// Price tab
const partPrices = ref([])
const priceLoading = ref(false)
const rawMaterials = ref([])
const rawMaterialSaving = ref(false)

async function loadOrg() {
  loading.value = true
  try {
    org.value = await fetchOrgDetail(orgId)
    resetEditForm()
  } catch (e) {
    console.error('Failed to load org:', e)
    org.value = null
  } finally {
    loading.value = false
  }
}

function resetEditForm() {
  if (!org.value) return
  editForm.value = {
    name: org.value.name,
    credit_code: org.value.credit_code || '',
    legal_person: org.value.legal_person || '',
    has_assembly: org.value.has_assembly || false,
    cooperation_status: org.value.cooperation_status || 'active',
    cooperation_note: org.value.cooperation_note || '',
    contact_phone: org.value.contact_phone || '',
    address: org.value.address || '',
    bank_info: {
      bank_name: org.value.bank_info?.bank_name || '',
      bank_account: org.value.bank_info?.bank_account || '',
      bank_branch: org.value.bank_info?.bank_branch || ''
    }
  }
}

function cancelEdit() {
  editing.value = false
  resetEditForm()
}

async function saveInfo() {
  saving.value = true
  try {
    org.value = await updateOrg(orgId, editForm.value)
    editing.value = false
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function loadRawMaterials() {
  try {
    const result = await fetchRawMaterials(orgId)
    rawMaterials.value = result.list || []
  } catch (e) {
    rawMaterials.value = []
  }
}

function addRawMaterial() {
  rawMaterials.value.push({
    material_id: `rm_${Date.now()}`,
    name: '',
    note: ''
  })
}

function removeRawMaterial(index) {
  rawMaterials.value.splice(index, 1)
}

async function saveRawMaterials() {
  rawMaterialSaving.value = true
  try {
    const result = await updateRawMaterials(orgId, rawMaterials.value)
    rawMaterials.value = result.list || []
    ElMessage.success('原材料配置已保存')
  } catch (e) {
    ElMessage.error(e.message || '保存原材料失败')
  } finally {
    rawMaterialSaving.value = false
  }
}

// Address
async function loadAddresses() {
  addressLoading.value = true
  try {
    const result = await fetchAddressList({ orgId })
    addresses.value = result.list || []
  } catch (e) {
    addresses.value = []
  } finally {
    addressLoading.value = false
  }
}

function editAddress(row) {
  addressForm.value = { ...row }
  showAddressDialog.value = true
}

async function saveAddress() {
  if (!addressForm.value.type || !addressForm.value.label || !addressForm.value.detail) {
    ElMessage.warning('请填写必填字段')
    return
  }
  addressSaving.value = true
  try {
    if (addressForm.value._id) {
      await updateAddress(addressForm.value._id, addressForm.value)
    } else {
      await createAddress({ ...addressForm.value, org_id: orgId, org_name: org.value?.name })
    }
    ElMessage.success('保存成功')
    showAddressDialog.value = false
    addressForm.value = { type: 'factory', label: '', province: '', city: '', district: '', detail: '', contact_name: '', contact_phone: '' }
    loadAddresses()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    addressSaving.value = false
  }
}

async function handleDeleteAddress(id) {
  await ElMessageBox.confirm('确定删除该地址？', '提示', { type: 'warning' })
  try {
    await deleteAddress(id)
    ElMessage.success('删除成功')
    loadAddresses()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

// Members
async function loadMembers() {
  memberLoading.value = true
  try {
    const result = await fetchMembers(orgId)
    members.value = result.list || []
  } catch (e) {
    members.value = []
  } finally {
    memberLoading.value = false
  }
}

async function handleAddMember() {
  if (!memberForm.value.name || !memberForm.value.phone) {
    ElMessage.warning('请填写姓名和手机号')
    return
  }
  memberSaving.value = true
  try {
    await addMember({ orgId, ...memberForm.value })
    ElMessage.success('添加成功')
    showMemberDialog.value = false
    memberForm.value = { name: '', phone: '', role: 'supplier_member' }
    loadMembers()
  } catch (e) {
    ElMessage.error(e.message || '添加失败')
  } finally {
    memberSaving.value = false
  }
}

async function handleDeleteMember(id) {
  await ElMessageBox.confirm('确定删除该成员？', '提示', { type: 'warning' })
  try {
    await deleteMember(id)
    ElMessage.success('删除成功')
    loadMembers()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

// Prices
async function loadPrices() {
  priceLoading.value = true
  try {
    const result = await fetchPartPrices(orgId)
    partPrices.value = result.list || []
  } catch (e) {
    partPrices.value = []
  } finally {
    priceLoading.value = false
  }
}

let priceTimer = null
function handlePriceChange(partTypeId, val) {
  clearTimeout(priceTimer)
  priceTimer = setTimeout(async () => {
    try {
      await updatePartPrice(partTypeId, { unit_price: val })
    } catch (e) {
      ElMessage.error('价格更新失败')
    }
  }, 500)
}

function handlePriceNoteChange(partTypeId, note) {
  clearTimeout(priceTimer)
  priceTimer = setTimeout(async () => {
    try {
      await updatePartPrice(partTypeId, { price_note: note })
    } catch (e) {
      ElMessage.error('备注更新失败')
    }
  }, 500)
}

// Tab change lazy load
watch(activeTab, (tab) => {
  if (tab === 'address' && addresses.value.length === 0) loadAddresses()
  if (tab === 'members' && members.value.length === 0) loadMembers()
  if (tab === 'materials' && rawMaterials.value.length === 0) loadRawMaterials()
  if (tab === 'prices' && partPrices.value.length === 0) loadPrices()
})

function goBack() { router.push('/suppliers') }

onMounted(() => {
  loadOrg()
  // Pre-load addresses since it's commonly needed
  loadAddresses()
  loadRawMaterials()
})
</script>
