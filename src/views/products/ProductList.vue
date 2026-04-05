<template>
  <div>
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="4" v-for="stat in statsCards" :key="stat.label">
        <div class="stat-card">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          <div class="stat-sub">{{ stat.sub }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-bottom: 20px">
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
        <el-input
          v-model="searchText"
          placeholder="搜索产品名称 / 编号 / ASIN"
          prefix-icon="Search"
          clearable
          style="width: 320px"
          @input="debouncedSearch"
        />
        <el-select v-model="typeFilter" placeholder="产品类型" clearable style="width: 160px" @change="loadProducts">
          <el-option label="组装产品" value="assembly" />
          <el-option label="简易产品" value="simple" />
          <el-option label="配件产品" value="accessory" />
        </el-select>
        <el-select v-model="categoryFilter" placeholder="产品类别" clearable style="width: 160px" @change="loadProducts">
          <el-option label="猫窗台架" value="猫窗台架" />
          <el-option label="猫抓板" value="猫抓板" />
          <el-option label="配件" value="配件" />
        </el-select>
        <div style="flex: 1" />
        <el-button type="primary" icon="Plus" @click="openCreateDialog">新增产品</el-button>
      </div>
    </el-card>

    <div v-if="loading" style="text-align: center; padding: 60px 0">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p style="color: #999; margin-top: 12px">加载中...</p>
    </div>

    <el-row v-else :gutter="16">
      <el-col :span="6" v-for="product in productList" :key="product._id" style="margin-bottom: 16px">
        <div class="product-card" @click="goToDetail(product._id)">
          <div class="product-code">{{ product.code }}</div>
          <div class="product-name">{{ product.name_cn }}</div>
          <div class="product-asin">{{ product.parent_asin || '未填写父 ASIN' }}</div>
          <el-tag :type="typeTagMap[product.type]" size="small" style="margin-top: 8px">
            {{ typeTextMap[product.type] }}
          </el-tag>
          <div class="product-meta">
            <div class="meta-item" style="flex: 1">
              <span class="meta-value" style="color: var(--color-primary)">{{ (product.skus || []).length }}</span>
              <span class="meta-label">SKU</span>
            </div>
            <div class="meta-item" style="flex: 1">
              <span class="meta-value" style="color: var(--color-success)">{{ getUniqueParts(product) }}</span>
              <span class="meta-label">配件种类</span>
            </div>
            <div class="meta-item" style="flex: 1">
              <span class="meta-value" style="color: var(--color-warning)">{{ getSupplierCount(product) }}</span>
              <span class="meta-label">供应商</span>
            </div>
          </div>
          <div class="product-actions" @click.stop>
            <el-button size="small" @click="goToDetail(product._id)">管理</el-button>
            <el-button type="danger" size="small" plain @click="confirmDeleteProduct(product)">删除</el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && productList.length === 0" description="暂无产品数据" />

    <el-dialog v-model="showCreateDialog" title="新增产品" width="560px" @closed="resetCreateForm">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="产品编号" required>
          <el-input v-model="createForm.code" placeholder="如：CWP10" />
        </el-form-item>
        <el-form-item label="中文名称" required>
          <el-input v-model="createForm.name_cn" />
        </el-form-item>
        <el-form-item label="英文名称">
          <el-input v-model="createForm.name_en" />
        </el-form-item>
        <el-form-item label="父 ASIN">
          <el-input v-model="createForm.parent_asin" />
        </el-form-item>
        <el-form-item label="产品类型" required>
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="组装产品" value="assembly" />
            <el-option label="简易产品" value="simple" />
            <el-option label="配件产品" value="accessory" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品类别">
          <el-input v-model="createForm.category" placeholder="如：猫窗台架 / 猫抓板 / 配件" />
        </el-form-item>
        <el-form-item label="预警天数">
          <el-input-number v-model="createForm.alert_days" :min="1" :max="365" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateProduct">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { createProduct, deleteProduct, fetchProductList, fetchProductStats } from '../../services/product'

const router = useRouter()
const searchText = ref('')
const typeFilter = ref('')
const categoryFilter = ref('')
const loading = ref(false)
const creating = ref(false)
const showCreateDialog = ref(false)
const productList = ref([])
const stats = ref({})

const createForm = reactive({
  code: '',
  name_cn: '',
  name_en: '',
  parent_asin: '',
  type: 'assembly',
  category: '',
  alert_days: 15
})

const statsCards = computed(() => [
  { label: '产品 Listing', value: stats.value.totalListings || 0, sub: '父 ASIN 总数', color: 'var(--color-primary)' },
  { label: '总 SKU 数', value: stats.value.totalSkus || 0, sub: '子 ASIN 总数', color: 'var(--color-success)' },
  { label: '组装产品', value: stats.value.assembled || 0, sub: '需要 BOM 管理', color: 'var(--color-warning)' },
  { label: '配件产品', value: stats.value.accessories || 0, sub: '单独售卖', color: '#7C3AED' },
  { label: '简易产品', value: stats.value.simple || 0, sub: '猫抓板等', color: 'var(--color-danger)' },
  { label: '唯一配件', value: stats.value.totalParts || 0, sub: '配件库', color: '#059669' }
])

const typeTagMap = { assembly: 'primary', simple: 'success', accessory: 'warning' }
const typeTextMap = { assembly: '组装产品', simple: '简易产品', accessory: '配件产品' }

let searchTimer = null

function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadProducts(), 300)
}

async function loadProducts() {
  loading.value = true
  try {
    const params = { page: 1, pageSize: 100 }
    if (searchText.value) params.keyword = searchText.value
    if (typeFilter.value) params.type = typeFilter.value
    if (categoryFilter.value) params.category = categoryFilter.value

    const result = await fetchProductList(params)
    productList.value = result.list || []
  } catch (error) {
    console.error('Failed to load products:', error)
    productList.value = []
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    stats.value = await fetchProductStats()
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

function getUniqueParts(product) {
  const parts = new Set()
  ;(product.skus || []).forEach((sku) => (sku.bom_items || []).forEach((bom) => parts.add(bom.part_name)))
  return parts.size
}

function getSupplierCount(product) {
  const suppliers = new Set()
  ;(product.skus || []).forEach((sku) => (sku.bom_items || []).forEach((bom) => {
    if (bom.supplier_org_id) suppliers.add(bom.supplier_org_id)
  }))
  return suppliers.size
}

function goToDetail(id) {
  router.push(`/products/${id}`)
}

function openCreateDialog() {
  resetCreateForm()
  showCreateDialog.value = true
}

function resetCreateForm() {
  createForm.code = ''
  createForm.name_cn = ''
  createForm.name_en = ''
  createForm.parent_asin = ''
  createForm.type = 'assembly'
  createForm.category = ''
  createForm.alert_days = 15
}

async function handleCreateProduct() {
  if (!createForm.code.trim() || !createForm.name_cn.trim() || !createForm.type) {
    ElMessage.warning('请填写产品编号、中文名称和产品类型')
    return
  }

  creating.value = true
  try {
    const created = await createProduct({
      code: createForm.code.trim(),
      name_cn: createForm.name_cn.trim(),
      name_en: createForm.name_en.trim(),
      parent_asin: createForm.parent_asin.trim(),
      type: createForm.type,
      category: createForm.category.trim(),
      alert_days: createForm.alert_days,
      skus: []
    })
    ElMessage.success('产品已创建')
    showCreateDialog.value = false
    await Promise.all([loadProducts(), loadStats()])
    router.push(`/products/${created._id}`)
  } catch (error) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function confirmDeleteProduct(product) {
  try {
    await ElMessageBox.confirm(
      `确认删除产品「${product.code} · ${product.name_cn}」吗？`,
      '删除产品',
      { type: 'warning' }
    )
    await deleteProduct(product._id)
    ElMessage.success('产品已删除')
    await Promise.all([loadProducts(), loadStats()])
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

onMounted(() => {
  loadProducts()
  loadStats()
})
</script>

<style scoped>
.product-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}
</style>
