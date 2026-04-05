<template>
  <div>
    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="4" v-for="stat in statsCards" :key="stat.label">
        <div class="stat-card">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          <div class="stat-sub">{{ stat.sub }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <div style="display: flex; gap: 16px; align-items: center">
        <el-input v-model="searchText" placeholder="搜索产品名称 / 编号 / ASIN" prefix-icon="Search" clearable style="width: 320px" @input="debouncedSearch" />
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
        <el-button type="primary" icon="Plus">新增产品</el-button>
      </div>
    </el-card>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 60px 0">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <p style="color: #999; margin-top: 12px">加载中...</p>
    </div>

    <!-- 产品卡片网格 -->
    <el-row v-else :gutter="16">
      <el-col :span="6" v-for="product in productList" :key="product._id" style="margin-bottom: 16px">
        <div class="product-card" @click="goToDetail(product._id)">
          <div class="product-code">{{ product.code }}</div>
          <div class="product-name">{{ product.name_cn }}</div>
          <div class="product-asin">{{ product.parent_asin }}</div>
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
        </div>
      </el-col>
    </el-row>

    <!-- 空状态 -->
    <el-empty v-if="!loading && productList.length === 0" description="暂无产品数据" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { fetchProductList, fetchProductStats } from '../../services/product'

const router = useRouter()
const searchText = ref('')
const typeFilter = ref('')
const categoryFilter = ref('')
const loading = ref(false)
const productList = ref([])
const stats = ref({})

const statsCards = computed(() => [
  { label: '产品 Listing', value: stats.value.totalListings || 0, sub: '父 ASIN 总数', color: 'var(--color-primary)' },
  { label: '总 SKU 数', value: stats.value.totalSkus || 0, sub: '子 ASIN 总数', color: 'var(--color-success)' },
  { label: '组装产品', value: stats.value.assembled || 0, sub: '需要 BOM 管理', color: 'var(--color-warning)' },
  { label: '配件产品', value: stats.value.accessories || 0, sub: '单独售卖', color: '#7C3AED' },
  { label: '简易产品', value: stats.value.simple || 0, sub: '猫抓板等', color: 'var(--color-danger)' },
  { label: '唯一配件', value: stats.value.totalParts || 0, sub: '配件库', color: '#059669' },
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
  } catch (e) {
    console.error('Failed to load products:', e)
    productList.value = []
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    stats.value = await fetchProductStats()
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

function getUniqueParts(product) {
  const parts = new Set()
  ;(product.skus || []).forEach(s => (s.bom_items || []).forEach(b => parts.add(b.part_name)))
  return parts.size
}

function getSupplierCount(product) {
  const sups = new Set()
  ;(product.skus || []).forEach(s => (s.bom_items || []).forEach(b => {
    if (b.supplier_org_id) sups.add(b.supplier_org_id)
  }))
  return sups.size
}

function goToDetail(id) {
  router.push(`/products/${id}`)
}

onMounted(() => {
  loadProducts()
  loadStats()
})
</script>
