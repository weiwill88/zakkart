<template>
  <div v-if="product">
    <!-- 返回按钮 + 产品概览 -->
    <el-page-header @back="goBack" style="margin-bottom: 24px">
      <template #content>
        <span style="font-size: 18px; font-weight: 600">{{ product.code }} · {{ product.name }}</span>
        <el-tag :type="typeTagMap[product.type]" size="small" style="margin-left: 12px">{{ typeTextMap[product.type] }}</el-tag>
      </template>
    </el-page-header>

    <!-- 产品基本信息卡片 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">📋 产品基本信息</span>
          <el-button type="primary" text icon="Edit" @click="editMode = !editMode">
            {{ editMode ? '保存' : '编辑' }}
          </el-button>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="产品编号">
          <el-input v-if="editMode" v-model="product.code" size="small" />
          <span v-else style="font-weight: 600; color: var(--color-primary)">{{ product.code }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="产品名称">
          <el-input v-if="editMode" v-model="product.name" size="small" />
          <span v-else>{{ product.name }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="英文名">
          <el-input v-if="editMode" v-model="product.nameEn" size="small" />
          <span v-else>{{ product.nameEn }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="父 ASIN">
          <code style="background: #F3F4F6; padding: 2px 8px; border-radius: 4px">{{ product.parentAsin }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="产品类别">{{ product.category }}</el-descriptions-item>
        <el-descriptions-item label="产品类型">
          <el-tag :type="typeTagMap[product.type]" size="small">{{ typeTextMap[product.type] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="SKU 数量">
          <span style="font-weight: 700; font-size: 16px; color: var(--color-primary)">{{ product.skus.length }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag type="success" size="small">在售</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- SKU 列表 + BOM 展开 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">📦 SKU 列表 & BOM 配件构成</span>
          <el-button type="primary" plain icon="Plus" size="small">添加 SKU</el-button>
        </div>
      </template>
      <el-table :data="product.skus" border stripe style="width: 100%" row-key="id" default-expand-all>
        <el-table-column type="expand">
          <template #default="{ row }">
            <div style="padding: 16px 32px">
              <div style="font-weight: 600; margin-bottom: 12px; color: var(--color-text-secondary)">BOM 配件清单</div>
              <el-table :data="row.bom" border size="small" style="width: 100%">
                <el-table-column label="配件类型" width="120">
                  <template #default="{ row: bomRow }">
                    <span :class="['part-type-tag', getPartTypeInfo(bomRow.partType).tagClass]">
                      {{ getPartTypeInfo(bomRow.partType).icon }} {{ getPartTypeInfo(bomRow.partType).label }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="partName" label="配件名称" min-width="200" />
                <el-table-column label="数量" width="80" align="center">
                  <template #default="{ row: bomRow }">
                    <span style="font-weight: 700">×{{ bomRow.qty }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="variant" label="变体/规格" width="120" />
                <el-table-column label="对应供应商" width="200">
                  <template #default="{ row: bomRow }">
                    <span style="font-size: 13px; color: var(--color-text-secondary)">{{ getSupplierForPart(bomRow.partType) }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="SKU 编号" width="180">
          <template #default="{ row }">
            <span style="font-weight: 600">{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column label="子 ASIN" width="160">
          <template #default="{ row }">
            <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px; font-size: 12px">{{ row.childAsin }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格说明" min-width="200" />
        <el-table-column label="配件数" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.bom.length }} 种</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default>
            <el-button type="primary" text size="small" icon="Edit">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 关联供应商 -->
    <el-card shadow="never">
      <template #header><span style="font-weight: 600">🏭 关联供应商</span></template>
      <el-table :data="relatedSuppliers" border size="small">
        <el-table-column prop="name" label="公司名称" min-width="240" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column label="负责配件" width="200">
          <template #default="{ row }">
            <el-tag v-for="pt in row.partTypes" :key="pt" size="small" :class="getPartTypeInfo(pt).tagClass" style="margin-right: 4px">
              {{ getPartTypeInfo(pt).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="合作范围" min-width="280" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { products, PART_TYPES } from '../../data/products.js'
import { suppliers } from '../../data/suppliers.js'

const route = useRoute()
const router = useRouter()
const editMode = ref(false)

const typeTagMap = { assembled: 'primary', simple: 'success', accessory: 'warning' }
const typeTextMap = { assembled: '组装产品', simple: '简易产品', accessory: '配件产品' }

const product = computed(() => products.find(p => p.id === route.params.id))

const relatedSuppliers = computed(() => {
  if (!product.value) return []
  return suppliers.filter(s => s.productCodes.some(c => product.value.code.startsWith(c)))
})

function getPartTypeInfo(type) {
  return Object.values(PART_TYPES).find(pt => pt.key === type) || { label: type, tagClass: '', icon: '📦' }
}

function getSupplierForPart(partType) {
  const sup = suppliers.find(s => s.partTypes.includes(partType) && 
    product.value && s.productCodes.some(c => product.value.code.startsWith(c)))
  return sup ? sup.name.slice(0, 6) + '...' : '-'
}

function goBack() { router.push('/products') }
</script>
