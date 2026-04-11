<template>
  <div v-loading="loading">
    <div v-if="product">
      <el-page-header @back="goBack" style="margin-bottom: 24px">
        <template #content>
          <span style="font-size: 18px; font-weight: 600">{{ product.code }} · {{ product.name_cn }}</span>
          <el-tag :type="typeTagMap[product.type]" size="small" style="margin-left: 12px">{{ typeTextMap[product.type] }}</el-tag>
        </template>
        <template #extra>
          <div style="display: flex; gap: 8px">
            <el-button @click="openProductDialog">编辑产品</el-button>
            <el-button type="danger" plain @click="handleDeleteProduct">删除产品</el-button>
          </div>
        </template>
      </el-page-header>

      <el-card shadow="never" style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="font-weight: 600">产品基本信息</span>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="产品编号">
            <span style="font-weight: 600; color: var(--color-primary)">{{ product.code }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ product.name_cn }}</el-descriptions-item>
          <el-descriptions-item label="英文名">{{ product.name_en || '-' }}</el-descriptions-item>
          <el-descriptions-item label="父 ASIN">
            <code style="background: #F3F4F6; padding: 2px 8px; border-radius: 4px">{{ product.parent_asin || '-' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="产品类别">{{ product.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="产品类型">
            <el-tag :type="typeTagMap[product.type]" size="small">{{ typeTextMap[product.type] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="SKU 数量">
            <span style="font-weight: 700; font-size: 16px; color: var(--color-primary)">{{ (product.skus || []).length }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="库存预警天数">{{ product.alert_days || '-' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(product.updated_at) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="font-weight: 600">SKU 列表</span>
            <el-button type="primary" icon="Plus" @click="openSkuDialog()">新增 SKU</el-button>
          </div>
        </template>

        <el-table :data="product.skus || []" border stripe style="width: 100%" row-key="sku_id" default-expand-all>
          <el-table-column type="expand">
            <template #default="{ row }">
              <div style="padding: 16px 32px">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
                  <div style="font-weight: 600; color: var(--color-text-secondary)">BOM 配件清单</div>
                  <el-button size="small" @click="openBomDialog(row)">编辑 BOM</el-button>
                </div>
                <el-table :data="row.bom_items || []" border size="small" style="width: 100%">
                  <el-table-column label="配件类型" width="140">
                    <template #default="{ row: bomRow }">
                      <span>{{ getCategoryLabel(bomRow.part_type_id) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="part_name" label="配件名称" min-width="180" />
                  <el-table-column label="数量" width="90" align="center">
                    <template #default="{ row: bomRow }">
                      <span style="font-weight: 700">&times;{{ bomRow.quantity }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="variant" label="变体/规格" width="140" />
                  <el-table-column label="供应商" width="220">
                    <template #default="{ row: bomRow }">
                      <span style="font-size: 13px; color: var(--color-text-secondary)">{{ bomRow.supplier_name || '-' }}</span>
                    </template>
                  </el-table-column>
                </el-table>
                <el-empty v-if="!(row.bom_items || []).length" description="该 SKU 暂无 BOM 配件" />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="SKU ID" width="160">
            <template #default="{ row }">
              <span style="font-weight: 600">{{ row.sku_id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="子 ASIN" width="180">
            <template #default="{ row }">
              <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px; font-size: 12px">{{ row.child_asin || '-' }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="spec" label="规格说明" min-width="200" />
          <el-table-column label="配件数" width="100" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">{{ (row.bom_items || []).length }} 种</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center">
            <template #default="{ row }">
              <el-button size="small" @click="openSkuDialog(row)">编辑 SKU</el-button>
              <el-button size="small" @click="openBomDialog(row)">编辑 BOM</el-button>
              <el-button type="danger" size="small" plain @click="handleDeleteSku(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header><span style="font-weight: 600">关联供应商</span></template>
        <el-table :data="relatedSuppliers" border size="small">
          <el-table-column prop="supplier_name" label="公司名称" min-width="240" />
          <el-table-column prop="category" label="配件类别" width="180" />
          <el-table-column label="配件数量" width="100" align="center">
            <template #default="{ row }">{{ row.partCount }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="relatedSuppliers.length === 0" description="暂无关联供应商" />
      </el-card>
    </div>

    <el-empty v-if="!loading && !product" description="产品不存在">
      <el-button type="primary" @click="goBack">返回列表</el-button>
    </el-empty>

    <el-dialog v-model="showProductDialog" :title="productDialogTitle" width="560px" @closed="resetProductForm">
      <el-form :model="productForm" label-width="100px">
        <el-form-item label="产品编号" required>
          <el-input v-model="productForm.code" />
        </el-form-item>
        <el-form-item label="中文名称" required>
          <el-input v-model="productForm.name_cn" />
        </el-form-item>
        <el-form-item label="英文名称">
          <el-input v-model="productForm.name_en" />
        </el-form-item>
        <el-form-item label="父 ASIN">
          <el-input v-model="productForm.parent_asin" />
        </el-form-item>
        <el-form-item label="产品类型" required>
          <el-select v-model="productForm.type" style="width: 100%">
            <el-option label="组装产品" value="assembly" />
            <el-option label="简易产品" value="simple" />
            <el-option label="配件产品" value="accessory" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品类别">
          <el-input v-model="productForm.category" />
        </el-form-item>
        <el-form-item label="预警天数">
          <el-input-number v-model="productForm.alert_days" :min="1" :max="365" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showProductDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingProduct" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSkuDialog" :title="skuDialogTitle" width="520px" @closed="resetSkuForm">
      <el-form :model="skuForm" label-width="100px">
        <el-form-item label="SKU ID" required>
          <el-input v-model="skuForm.sku_id" :disabled="skuMode === 'edit'" />
        </el-form-item>
        <el-form-item label="子 ASIN">
          <el-input v-model="skuForm.child_asin" />
        </el-form-item>
        <el-form-item label="规格说明" required>
          <el-input v-model="skuForm.spec" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSkuDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingSku" @click="saveSku">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBomDialog" :title="bomDialogTitle" width="960px" @closed="resetBomForm">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <div style="font-size: 13px; color: var(--color-text-secondary)">
          这里选择的是“配件管理项”，不是产品类别。供应商会从配件管理自动带出。
        </div>
        <div style="display: flex; gap: 8px">
          <el-button size="small" @click="router.push('/part-types')">管理配件管理项</el-button>
          <el-button type="primary" size="small" @click="addBomRow">新增配件</el-button>
        </div>
      </div>
      <div style="margin-bottom: 12px; font-size: 12px; color: var(--color-text-muted)">
        当前可选类别：{{ partTypeCategories.join(' / ') || '暂无配件管理数据' }}
      </div>
      <el-table :data="bomForm" border size="small">
        <el-table-column label="配件管理项" min-width="260">
          <template #default="{ row, $index }">
            <el-select
              v-model="row.part_type_id"
              filterable
              placeholder="请选择具体配件，如：垫子 / 01-白色"
              style="width: 100%"
              @change="(value) => handlePartTypeChange($index, value)"
            >
              <el-option
                v-for="item in partTypeCatalog"
                :key="item._id"
                :label="`${item.category} / ${item.name}`"
                :value="item._id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="配件名称" min-width="180">
          <template #default="{ row }">
            <el-input v-model="row.part_name" />
          </template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.quantity" :min="1" :precision="0" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="变体/规格" width="160">
          <template #default="{ row }">
            <el-input v-model="row.variant" />
          </template>
        </el-table-column>
        <el-table-column label="供应商" width="220">
          <template #default="{ row }">
            <el-input v-model="row.supplier_name" disabled />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button type="danger" text @click="removeBomRow($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="bomForm.length === 0" description="暂无 BOM 配件，请点击右上角新增" />
      <template #footer>
        <el-button @click="showBomDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingBom" @click="saveBom">保存 BOM</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addSku,
  deleteProduct,
  deleteSku,
  fetchProductDetail,
  fetchProductPartTypeCatalog,
  updateBom,
  updateProduct,
  updateSku
} from '../../services/product'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const savingProduct = ref(false)
const savingSku = ref(false)
const savingBom = ref(false)
const showProductDialog = ref(false)
const showSkuDialog = ref(false)
const showBomDialog = ref(false)
const skuMode = ref('create')
const product = ref(null)
const partTypeCatalog = ref([])
const bomTargetSkuId = ref('')

const productForm = reactive({
  code: '',
  name_cn: '',
  name_en: '',
  parent_asin: '',
  type: 'assembly',
  category: '',
  alert_days: 15
})

const skuForm = reactive({
  sku_id: '',
  child_asin: '',
  spec: ''
})

const bomForm = ref([])

const typeTagMap = { assembly: 'primary', simple: 'success', accessory: 'warning' }
const typeTextMap = { assembly: '组装产品', simple: '简易产品', accessory: '配件产品' }

const productDialogTitle = computed(() => '编辑产品')
const skuDialogTitle = computed(() => (skuMode.value === 'create' ? '新增 SKU' : '编辑 SKU'))
const bomDialogTitle = computed(() => `编辑 BOM${bomTargetSkuId.value ? ` · ${bomTargetSkuId.value}` : ''}`)

const partTypeMap = computed(() => Object.fromEntries(partTypeCatalog.value.map(item => [item._id, item])))
const partTypeCategories = computed(() => [...new Set(partTypeCatalog.value.map(item => item.category))])

const relatedSuppliers = computed(() => {
  if (!product.value) return []
  const map = new Map()
  ;(product.value.skus || []).forEach((sku) => {
    ;(sku.bom_items || []).forEach((bom) => {
      const key = bom.supplier_org_id || `supplier:${bom.supplier_name || ''}`
      if (!map.has(key)) {
        map.set(key, {
          supplier_name: bom.supplier_name || '-',
          categories: new Set(),
          partCount: 0
        })
      }
      map.get(key).categories.add(getCategoryLabel(bom.part_type_id))
      map.get(key).partCount += 1
    })
  })
  return Array.from(map.values()).map(item => ({
    supplier_name: item.supplier_name,
    category: Array.from(item.categories).filter(Boolean).join(' / ') || '-',
    partCount: item.partCount
  }))
})

function getCategoryLabel(partTypeId) {
  return partTypeMap.value[partTypeId]?.category || '-'
}

function goBack() {
  router.push('/products')
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('zh-CN') : '-'
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function loadPartTypeCatalog() {
  try {
    const result = await fetchProductPartTypeCatalog()
    partTypeCatalog.value = result.list || []
  } catch (error) {
    console.error('Failed to load part type catalog:', error)
    partTypeCatalog.value = []
  }
}

async function loadProduct() {
  loading.value = true
  try {
    product.value = await fetchProductDetail(route.params.id)
  } catch (error) {
    console.error('Failed to load product:', error)
    product.value = null
  } finally {
    loading.value = false
  }
}

function resetProductForm() {
  if (!product.value) return
  productForm.code = product.value.code || ''
  productForm.name_cn = product.value.name_cn || ''
  productForm.name_en = product.value.name_en || ''
  productForm.parent_asin = product.value.parent_asin || ''
  productForm.type = product.value.type || 'assembly'
  productForm.category = product.value.category || ''
  productForm.alert_days = product.value.alert_days || 15
}

function openProductDialog() {
  resetProductForm()
  showProductDialog.value = true
}

async function saveProduct() {
  if (!productForm.code.trim() || !productForm.name_cn.trim() || !productForm.type) {
    ElMessage.warning('请填写产品编号、中文名称和产品类型')
    return
  }

  savingProduct.value = true
  try {
    product.value = await updateProduct(product.value._id, {
      code: productForm.code.trim(),
      name_cn: productForm.name_cn.trim(),
      name_en: productForm.name_en.trim(),
      parent_asin: productForm.parent_asin.trim(),
      type: productForm.type,
      category: productForm.category.trim(),
      alert_days: productForm.alert_days
    })
    showProductDialog.value = false
    ElMessage.success('产品已更新')
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    savingProduct.value = false
  }
}

async function handleDeleteProduct() {
  try {
    await ElMessageBox.confirm(
      `确认删除产品「${product.value.code} · ${product.value.name_cn}」吗？`,
      '删除产品',
      { type: 'warning' }
    )
    await deleteProduct(product.value._id)
    ElMessage.success('产品已删除')
    router.replace('/products')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function resetSkuForm() {
  skuForm.sku_id = ''
  skuForm.child_asin = ''
  skuForm.spec = ''
}

function openSkuDialog(sku = null) {
  if (sku) {
    skuMode.value = 'edit'
    skuForm.sku_id = sku.sku_id || ''
    skuForm.child_asin = sku.child_asin || ''
    skuForm.spec = sku.spec || ''
  } else {
    skuMode.value = 'create'
    resetSkuForm()
  }
  showSkuDialog.value = true
}

async function saveSku() {
  if (!skuForm.sku_id.trim() || !skuForm.spec.trim()) {
    ElMessage.warning('请填写 SKU ID 和规格说明')
    return
  }

  savingSku.value = true
  try {
    if (skuMode.value === 'create') {
      product.value = await addSku(product.value._id, {
        sku_id: skuForm.sku_id.trim(),
        child_asin: skuForm.child_asin.trim(),
        spec: skuForm.spec.trim(),
        bom_items: []
      })
      ElMessage.success('SKU 已新增')
    } else {
      await updateSku(product.value._id, skuForm.sku_id, {
        child_asin: skuForm.child_asin.trim(),
        spec: skuForm.spec.trim()
      })
      await loadProduct()
      ElMessage.success('SKU 已更新')
    }
    showSkuDialog.value = false
  } catch (error) {
    ElMessage.error(error.message || '保存 SKU 失败')
  } finally {
    savingSku.value = false
  }
}

async function handleDeleteSku(sku) {
  try {
    await ElMessageBox.confirm(`确认删除 SKU「${sku.sku_id}」吗？`, '删除 SKU', { type: 'warning' })
    await deleteSku(product.value._id, sku.sku_id)
    await loadProduct()
    ElMessage.success('SKU 已删除')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除 SKU 失败')
    }
  }
}

function resetBomForm() {
  bomTargetSkuId.value = ''
  bomForm.value = []
}

function normalizeBomItem(item) {
  return {
    part_type_id: item.part_type_id || '',
    part_name: item.part_name || '',
    quantity: Number(item.quantity) || 1,
    variant: item.variant || '',
    supplier_org_id: item.supplier_org_id || '',
    supplier_name: item.supplier_name || ''
  }
}

function openBomDialog(sku) {
  bomTargetSkuId.value = sku.sku_id
  bomForm.value = clone((sku.bom_items || []).map(normalizeBomItem))
  showBomDialog.value = true
}

function addBomRow() {
  bomForm.value.push(normalizeBomItem({}))
}

function removeBomRow(index) {
  bomForm.value.splice(index, 1)
}

function handlePartTypeChange(index, partTypeId) {
  const selected = partTypeMap.value[partTypeId]
  if (!selected) return

  bomForm.value[index] = {
    ...bomForm.value[index],
    part_type_id: selected._id,
    part_name: selected.name,
    supplier_org_id: selected.supplier_org_id,
    supplier_name: selected.supplier_org_name
  }
}

async function saveBom() {
  for (let index = 0; index < bomForm.value.length; index += 1) {
    const item = bomForm.value[index]
    if (!item.part_type_id || !item.part_name || !item.quantity) {
      ElMessage.warning(`请完整填写第 ${index + 1} 行 BOM 信息`)
      return
    }
  }

  savingBom.value = true
  try {
    await updateBom(
      product.value._id,
      bomTargetSkuId.value,
      bomForm.value.map(item => ({
        part_type_id: item.part_type_id,
        part_name: item.part_name.trim(),
        quantity: Number(item.quantity),
        variant: item.variant.trim(),
        supplier_org_id: item.supplier_org_id || '',
        supplier_name: item.supplier_name || ''
      }))
    )
    await loadProduct()
    showBomDialog.value = false
    ElMessage.success('BOM 已更新')
  } catch (error) {
    ElMessage.error(error.message || '保存 BOM 失败')
  } finally {
    savingBom.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadProduct(), loadPartTypeCatalog()])
})
</script>
