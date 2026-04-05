<template>
  <div v-loading="loading">
    <div v-if="product">
      <!-- 返回按钮 + 产品概览 -->
      <el-page-header @back="goBack" style="margin-bottom: 24px">
        <template #content>
          <span style="font-size: 18px; font-weight: 600">{{ product.code }} · {{ product.name_cn }}</span>
          <el-tag :type="typeTagMap[product.type]" size="small" style="margin-left: 12px">{{ typeTextMap[product.type] }}</el-tag>
        </template>
      </el-page-header>

      <!-- 产品基本信息卡片 -->
      <el-card shadow="never" style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="font-weight: 600">产品基本信息</span>
            <el-button v-if="!editMode" type="primary" text icon="Edit" @click="startEdit">编辑</el-button>
            <div v-else>
              <el-button @click="cancelEdit">取消</el-button>
              <el-button type="primary" @click="saveProduct" :loading="saving">保存</el-button>
            </div>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="产品编号">
            <el-input v-if="editMode" v-model="editForm.code" size="small" />
            <span v-else style="font-weight: 600; color: var(--color-primary)">{{ product.code }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="产品名称">
            <el-input v-if="editMode" v-model="editForm.name_cn" size="small" />
            <span v-else>{{ product.name_cn }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="英文名">
            <el-input v-if="editMode" v-model="editForm.name_en" size="small" />
            <span v-else>{{ product.name_en }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="父 ASIN">
            <code style="background: #F3F4F6; padding: 2px 8px; border-radius: 4px">{{ product.parent_asin }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="产品类别">{{ product.category }}</el-descriptions-item>
          <el-descriptions-item label="产品类型">
            <el-tag :type="typeTagMap[product.type]" size="small">{{ typeTextMap[product.type] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="SKU 数量">
            <span style="font-weight: 700; font-size: 16px; color: var(--color-primary)">{{ (product.skus || []).length }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="库存预警天数">{{ product.alert_days }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- SKU 列表 + BOM 展开 -->
      <el-card shadow="never" style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="font-weight: 600">SKU 列表 & BOM 配件构成</span>
          </div>
        </template>
        <el-table :data="product.skus || []" border stripe style="width: 100%" row-key="sku_id" default-expand-all>
          <el-table-column type="expand">
            <template #default="{ row }">
              <div style="padding: 16px 32px">
                <div style="font-weight: 600; margin-bottom: 12px; color: var(--color-text-secondary)">BOM 配件清单</div>
                <el-table :data="row.bom_items || []" border size="small" style="width: 100%">
                  <el-table-column label="配件类型" width="120">
                    <template #default="{ row: bomRow }">
                      <span>{{ getCategoryLabel(bomRow.part_type_id) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="part_name" label="配件名称" min-width="200" />
                  <el-table-column label="数量" width="80" align="center">
                    <template #default="{ row: bomRow }">
                      <span style="font-weight: 700">&times;{{ bomRow.quantity }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="variant" label="变体/规格" width="120" />
                  <el-table-column label="供应商" width="200">
                    <template #default="{ row: bomRow }">
                      <span style="font-size: 13px; color: var(--color-text-secondary)">{{ bomRow.supplier_name || '-' }}</span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="SKU ID" width="160">
            <template #default="{ row }">
              <span style="font-weight: 600">{{ row.sku_id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="子 ASIN" width="160">
            <template #default="{ row }">
              <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px; font-size: 12px">{{ row.child_asin }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="spec" label="规格说明" min-width="200" />
          <el-table-column label="配件数" width="100" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ (row.bom_items || []).length }} 种</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 关联供应商 -->
      <el-card shadow="never">
        <template #header><span style="font-weight: 600">关联供应商</span></template>
        <el-table :data="relatedSuppliers" border size="small">
          <el-table-column prop="supplier_name" label="公司名称" min-width="240" />
          <el-table-column prop="category" label="配件类别" width="120" />
          <el-table-column label="配件数量" width="100" align="center">
            <template #default="{ row }">{{ row.partCount }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-empty v-if="!loading && !product" description="产品不存在">
      <el-button type="primary" @click="goBack">返回列表</el-button>
    </el-empty>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchProductDetail, fetchProductPartTypes, updateProduct } from '../../services/product'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const editMode = ref(false)
const product = ref(null)
const editForm = ref({})
const partTypeMap = ref({})

const typeTagMap = { assembly: 'primary', simple: 'success', accessory: 'warning' }
const typeTextMap = { assembly: '组装产品', simple: '简易产品', accessory: '配件产品' }

const relatedSuppliers = computed(() => {
  if (!product.value) return []
  const map = new Map()
  ;(product.value.skus || []).forEach(sku => {
    ;(sku.bom_items || []).forEach(bom => {
      const key = bom.supplier_org_id
      if (!key) return
      if (!map.has(key)) {
        map.set(key, {
          supplier_org_id: key,
          supplier_name: bom.supplier_name || '-',
          categories: new Set(),
          partCount: 0
        })
      }
      map.get(key).categories.add(getCategoryLabel(bom.part_type_id))
      map.get(key).partCount++
    })
  })
  return Array.from(map.values()).map(item => ({
    supplier_org_id: item.supplier_org_id,
    supplier_name: item.supplier_name,
    category: Array.from(item.categories).filter(Boolean).join(' / ') || '-',
    partCount: item.partCount
  }))
})

function getCategoryLabel(partTypeId) {
  return partTypeMap.value[partTypeId]?.category || '-'
}

function resetEditForm() {
  if (!product.value) {
    editForm.value = {}
    return
  }

  editForm.value = {
    code: product.value.code || '',
    name_cn: product.value.name_cn || '',
    name_en: product.value.name_en || ''
  }
}

function startEdit() {
  resetEditForm()
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
  resetEditForm()
}

async function loadPartTypes(currentProduct) {
  const partTypeIds = Array.from(new Set(
    (currentProduct?.skus || [])
      .flatMap(sku => sku.bom_items || [])
      .map(item => item.part_type_id)
      .filter(Boolean)
  ))

  if (partTypeIds.length === 0) {
    partTypeMap.value = {}
    return
  }

  const result = await fetchProductPartTypes(partTypeIds)
  partTypeMap.value = Object.fromEntries(
    (result.list || []).map(item => [item._id, item])
  )
}

async function loadProduct() {
  loading.value = true
  try {
    product.value = await fetchProductDetail(route.params.id)
    resetEditForm()
    await loadPartTypes(product.value)
  } catch (e) {
    console.error('Failed to load product:', e)
    product.value = null
    partTypeMap.value = {}
  } finally {
    loading.value = false
  }
}

async function saveProduct() {
  saving.value = true
  try {
    const updated = await updateProduct(product.value._id, {
      code: editForm.value.code,
      name_cn: editForm.value.name_cn,
      name_en: editForm.value.name_en
    })
    product.value = updated
    editMode.value = false
    resetEditForm()
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function goBack() { router.push('/products') }

onMounted(() => {
  loadProduct()
})
</script>
