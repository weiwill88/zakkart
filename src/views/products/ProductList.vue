<template>
  <div>
    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="4" v-for="stat in stats" :key="stat.label">
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
        <el-input v-model="searchText" placeholder="搜索产品名称 / 编号 / ASIN" prefix-icon="Search" clearable style="width: 320px" />
        <el-select v-model="typeFilter" placeholder="产品类型" clearable style="width: 160px">
          <el-option label="组装产品" value="assembled" />
          <el-option label="简易产品" value="simple" />
          <el-option label="配件产品" value="accessory" />
        </el-select>
        <el-select v-model="categoryFilter" placeholder="产品类别" clearable style="width: 160px">
          <el-option label="猫窗台架" value="猫窗台架" />
          <el-option label="猫抓板" value="猫抓板" />
          <el-option label="配件" value="配件" />
        </el-select>
        <div style="flex: 1" />
        <el-button type="primary" icon="Plus">新增产品</el-button>
      </div>
    </el-card>

    <!-- 产品卡片网格 -->
    <el-row :gutter="16">
      <el-col :span="6" v-for="product in filteredProducts" :key="product.id" style="margin-bottom: 16px">
        <div class="product-card" @click="goToDetail(product.id)">
          <div class="product-code">{{ product.code }}</div>
          <div class="product-name">{{ product.name }}</div>
          <div class="product-asin">{{ product.parentAsin }}</div>
          <el-tag :type="typeTagMap[product.type]" size="small" style="margin-top: 8px">
            {{ typeTextMap[product.type] }}
          </el-tag>
          <div class="product-meta">
            <div class="meta-item" style="flex: 1">
              <span class="meta-value" style="color: var(--color-primary)">{{ product.skus.length }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { products, getProductStats, PART_TYPES } from '../../data/products.js'
import { suppliers } from '../../data/suppliers.js'

const router = useRouter()
const searchText = ref('')
const typeFilter = ref('')
const categoryFilter = ref('')

const productStats = getProductStats()
const stats = [
  { label: '产品 Listing', value: productStats.totalListings, sub: '父 ASIN 总数', color: 'var(--color-primary)' },
  { label: '总 SKU 数', value: productStats.totalSkus, sub: '子 ASIN 总数', color: 'var(--color-success)' },
  { label: '组装产品', value: productStats.assembled, sub: '需要 BOM 管理', color: 'var(--color-warning)' },
  { label: '配件产品', value: productStats.accessories, sub: '单独售卖', color: '#7C3AED' },
  { label: '供应商', value: suppliers.length, sub: '合作供应商', color: 'var(--color-danger)' },
  { label: '唯一配件', value: productStats.totalParts, sub: '配件库', color: '#059669' },
]

const typeTagMap = { assembled: 'primary', simple: 'success', accessory: 'warning' }
const typeTextMap = { assembled: '组装产品', simple: '简易产品', accessory: '配件产品' }

const filteredProducts = computed(() => {
  return products.filter(p => {
    const matchSearch = !searchText.value || 
      p.name.includes(searchText.value) || 
      p.code.includes(searchText.value) || 
      p.parentAsin.includes(searchText.value)
    const matchType = !typeFilter.value || p.type === typeFilter.value
    const matchCategory = !categoryFilter.value || p.category === categoryFilter.value
    return matchSearch && matchType && matchCategory
  })
})

function getUniqueParts(product) {
  const parts = new Set()
  product.skus.forEach(s => s.bom.forEach(b => parts.add(b.partType)))
  return parts.size
}

function getSupplierCount(product) {
  const sups = suppliers.filter(s => s.productCodes.some(c => product.code.startsWith(c)))
  return sups.length
}

function goToDetail(id) {
  router.push(`/products/${id}`)
}
</script>
