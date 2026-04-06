<template>
  <div>
    <!-- Step 1: 选择父 ASIN + 子 ASIN 分配 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">第一步：选择产品并分配数量</span>
          <el-tag type="info">以 Listing（父 ASIN）为单位下单</el-tag>
        </div>
      </template>

      <el-form label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="选择产品 Listing（父 ASIN）">
              <el-select v-model="selectedProductId" placeholder="选择产品" filterable style="width: 100%" @change="onProductChange">
                <el-option v-for="p in products" :key="p._id" :label="`${p.code} · ${p.name_cn} (${p.parent_asin || ''})`" :value="p._id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="采购总数量">
              <el-input-number v-model="totalQty" :min="1" :step="100" style="width: 100%" @change="recalcLastSku" :disabled="!selectedProduct" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label=" ">
              <el-button type="primary" @click="generateOrder" :disabled="!selectedProduct || totalQty < 1" style="width: 100%">
                生成订单 & 合同
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 子 ASIN 勾选与数量分配 -->
      <div v-if="selectedProduct" style="margin-top: 8px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <span style="font-weight: 600; color: var(--color-text-secondary)">
            子 ASIN 列表（共 {{ selectedProduct.skus.length }} 个，已选 {{ checkedSkus.length }} 个）
          </span>
          <div>
            <el-button text size="small" @click="selectAll">全选</el-button>
            <el-button text size="small" @click="deselectAll">取消全选</el-button>
            <el-tag style="margin-left: 8px">
              已分配：{{ allocatedTotal }} / {{ totalQty }}
              <span v-if="remainQty > 0" style="color: var(--color-warning)"> · 剩余 {{ remainQty }}</span>
              <span v-else-if="remainQty === 0" style="color: var(--color-success)"> ✓ 已分配完</span>
              <span v-else style="color: var(--color-danger)"> 超出 {{ -remainQty }}</span>
            </el-tag>
          </div>
        </div>

        <el-table :data="skuRows" border size="small" style="width: 100%">
          <el-table-column width="50" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.checked" @change="onSkuCheckChange(row)" />
            </template>
          </el-table-column>
          <el-table-column prop="sku_id" label="SKU 编号" width="160">
            <template #default="{ row }">
              <span :style="{ fontWeight: 600, opacity: row.checked ? 1 : 0.4 }">{{ row.sku_id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="子 ASIN" width="150">
            <template #default="{ row }">
              <code style="font-size: 11px; background: #F3F4F6; padding: 2px 6px; border-radius: 3px">{{ row.child_asin || '-' }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="spec" label="规格" min-width="180" />
          <el-table-column label="BOM 配件数" width="100" align="center">
            <template #default="{ row }">{{ (row.bom_items || []).length }} 种</template>
          </el-table-column>
          <el-table-column label="分配数量" width="200" align="center">
            <template #default="{ row, $index }">
              <template v-if="row.checked">
                <template v-if="isLastChecked($index)">
                  <el-tag type="success" size="small" style="font-size: 14px; font-weight: 700">{{ row.qty }}（自动计算）</el-tag>
                </template>
                <template v-else>
                  <el-input-number v-model="row.qty" :min="0" :max="totalQty" size="small" style="width: 150px" @change="recalcLastSku" />
                </template>
              </template>
              <span v-else style="color: var(--color-text-muted)">—</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- Step 2: 合同预览（按供应商分组） -->
    <template v-if="contracts.length > 0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <span style="font-size: 18px; font-weight: 600">合同预览（共 {{ contracts.length }} 份）</span>
        <div>
          <el-button type="success" :loading="savingAll" @click="saveAllContracts">保存全部草稿</el-button>
          <el-button type="warning" :loading="pushingAll" @click="pushAllContracts">一键推送确认</el-button>
          <el-button type="primary" @click="exportAllContracts">一键导出全部 Word</el-button>
        </div>
      </div>

      <el-tabs v-model="activeContract" type="card">
        <el-tab-pane v-for="(c, ci) in contracts" :key="ci" :label="c.supplierName.length > 4 ? c.supplierName.slice(0, 4) + '…' : c.supplierName" :name="String(ci)">
          <div class="contract-state-bar">
            <div class="contract-state-left">
              <el-tag :type="statusTagType(c._status)">{{ statusLabel(c._status) }}</el-tag>
              <el-tag :type="supplierConfirmTagType(c._supplierConfirmStatus)">{{ supplierConfirmLabel(c._supplierConfirmStatus) }}</el-tag>
            </div>
            <div class="contract-state-actions">
              <el-button size="small" :loading="isSaving(c)" @click="saveContract(ci)">保存此份草稿</el-button>
              <el-button size="small" type="warning" :loading="isPushing(c)" :disabled="!canPushConfirm(c)" @click="pushContract(ci)">
                {{ pushButtonLabel(c) }}
              </el-button>
              <el-button size="small" type="primary" @click="exportContract(ci)">导出此份合同 Word</el-button>
            </div>
          </div>
          <div class="contract-doc">
            <div class="contract-header">
              <div class="contract-number">合同编号：<input v-model="c.contractNo" class="contract-input" style="width: 280px" /></div>
              <h2 class="contract-title">采 购 合 同</h2>
            </div>

            <!-- 甲乙方信息 -->
            <div class="contract-parties">
              <div class="party-row"><span class="party-label">采购方（甲方）：</span><span class="party-value">上海掇骁贸易有限公司</span></div>
              <div class="party-row"><span class="party-label">法定代表人：</span><span class="party-value">闵一</span></div>
              <div class="party-row"><span class="party-label">统一社会信用代码：</span><span class="party-value">91310109MACHK7GN2R</span></div>
              <div class="party-row"><span class="party-label">地址：</span><span class="party-value">上海市虹口区同心路723号13幢5321室</span></div>
              <div class="party-row"><span class="party-label">联系方式：</span><span class="party-value">13262515903</span></div>
              <div style="height: 12px" />
              <div class="party-row"><span class="party-label">供货方（乙方）：</span><span class="party-value">{{ c.supplierName }}</span></div>
              <div class="party-row"><span class="party-label">法定代表人：</span><span class="party-value">{{ c.legalPerson }}</span></div>
              <div class="party-row"><span class="party-label">统一社会信用代码：</span><span class="party-value">{{ c.creditCode }}</span></div>
              <div class="party-row"><span class="party-label">地址：</span><input v-model="c.address" class="contract-input" style="width: 400px" placeholder="请填写乙方地址" /></div>
              <div class="party-row"><span class="party-label">联系方式：</span><input v-model="c.phone" class="contract-input" style="width: 200px" placeholder="请填写联系电话" /></div>
            </div>

            <!-- 前言 -->
            <p class="contract-text">
              经甲乙双方充分协商，根据《中华人民共和国合同法》及相关法律法规的有关规定，秉承公平、自愿、诚信的合作原则，就甲方向乙方采购
              <input v-model="c.productDesc" class="contract-input" style="width: 200px" placeholder="产品描述" />
              产品用以生产组装宠物吊床产品的事宜，双方订立本采购合同，并承诺共同遵守。
            </p>

            <!-- 一、采购货物说明 -->
            <h3 class="contract-section">一、采购货物说明：<input v-model="c.productDesc" class="contract-input" style="width: 160px" /></h3>
            <table class="contract-table">
              <thead>
                <tr>
                  <th>产品规格和尺寸标准</th>
                  <th>产品型号</th>
                  <th>产品重量</th>
                  <th>产品颜色</th>
                  <th>采购数量</th>
                  <th>采购单价（含税）</th>
                  <th>采购金额（含税）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in c.productItems" :key="idx">
                  <td>以产前样品为准</td>
                  <td style="font-weight: 600">{{ item.partName }}</td>
                  <td><input v-model="item.weight" class="contract-input-sm" placeholder="克/件" /></td>
                  <td>{{ item.colors }}</td>
                  <td style="white-space: pre-line">{{ item.qtyDetail }}</td>
                  <td><input v-model="item.unitPrice" class="contract-input-sm" placeholder="元/件" @input="calcItemTotal(c)" /></td>
                  <td style="font-weight: 600">{{ calcItemAmount(item) }}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="6" style="text-align: right; font-weight: 600">合计采购总金额（含税）</td>
                  <td style="font-weight: 700; color: var(--color-danger)">{{ calcGrandTotal(c) }}</td>
                </tr>
              </tbody>
            </table>

            <p class="contract-text"><strong>1. 成品货物要求：</strong>乙方生产货物的各项尺寸需要同附录一的产品规格和尺寸说明相符且产品颜色需要同甲乙双方确认的产品的产前样色卡相符，同时成品货物不能出现缝合线开线、布料缝合处有毛边、产品本身不整洁、棉花填充不均匀不足量、布料克重材质不达标等明显的质量问题。</p>
            <p class="contract-text"><strong>2. 乙方负责本合同产品生产的原材料有：</strong><textarea v-model="c.rawMaterials" class="contract-textarea" placeholder="请填写乙方需负责的原材料清单" /></p>
            <p class="contract-text"><strong>3.</strong> 货物实际生产时，上述产品尺寸、规格、重量、颜色发生调整改动的以双方认同的产品产前样为准。</p>

            <!-- 二、交付时间 -->
            <h3 class="contract-section">二、产品采购下单方式及产品交付时间：</h3>
            <p class="contract-text">本合同约定的采购产品，乙方承诺按下面的交付计划表完成全部产品的生产和包装工序并可交付甲方提货；</p>

            <!-- 交付计划在线表格 -->
            <table class="contract-table delivery-table">
              <thead>
                <tr>
                  <th style="width: 140px">交付提货时间</th>
                  <th v-for="col in c.deliveryCols" :key="col">{{ col }}</th>
                  <th style="width: 80px">总数量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in c.deliveryRows" :key="ri">
                  <td>
                    <input v-model="row.date" class="contract-input-sm" style="width: 110px" placeholder="YYYY/M/D" />
                  </td>
                  <td v-for="col in c.deliveryCols" :key="col">
                    <input v-model.number="row.qtys[col]" class="contract-input-sm" style="width: 60px; text-align: center" placeholder="0" @input="calcDeliveryRowTotal(row, c.deliveryCols)" />
                  </td>
                  <td style="font-weight: 600; text-align: center">{{ row.rowTotal || 0 }}</td>
                </tr>
                <tr class="total-row">
                  <td style="font-weight: 600; text-align: center">总数</td>
                  <td v-for="col in c.deliveryCols" :key="col" style="font-weight: 600; text-align: center">{{ calcDeliveryColTotal(c, col) }}</td>
                  <td style="font-weight: 700; text-align: center">{{ calcDeliveryGrandTotal(c) }}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin: 8px 0">
              <el-button text type="primary" size="small" @click="addDeliveryRow(c)">+ 增加一行</el-button>
              <el-button text type="danger" size="small" @click="c.deliveryRows.pop()" v-if="c.deliveryRows.length > 1">- 删除最后一行</el-button>
            </div>

            <!-- 三、产品合格率 -->
            <h3 class="contract-section">三、产品合格率与产品返工要求：</h3>
            <p class="contract-text">如乙方生产的货品中，有不符合本协议约定的产品标准和要求以及产品包装要求的货品（以下简称"不合格品"），则乙方保证在3个自然日内，对不合格品进行返工重做并承担返工所需的成本费用。且乙方保证本次所生产全部货品的不合格品率（不合格品率=不合格品/采购数量）在1%以下。</p>

            <!-- 四、支付方式 -->
            <h3 class="contract-section">四、支付方式：</h3>
            <p class="contract-text">
              甲方承诺在合同签署后，货物生产前将货物采购订金支付至乙方指定银行账户，采购订金为货物采购总金额的
              <input v-model="c.depositRate" class="contract-input-sm" style="width: 60px" placeholder="30" />%，
              乙方完成全部货物的生产后，甲方对乙方生产货物进行现场验收，并向乙方支付剩余
              <input v-model="c.balanceRate" class="contract-input-sm" style="width: 60px" placeholder="70" />%的采购尾款，
              如甲方验收时发现不合格品，则不合格品的尾款待乙方完成返工并交付甲方后，由甲方立即支付给乙方。
            </p>
            <div class="contract-text">
              <strong>乙方指定的收款账户信息如下：</strong><br />
              户名：<input v-model="c.bankName" class="contract-input" style="width: 280px" :placeholder="c.supplierName" /><br />
              账户号：<input v-model="c.bankAccount" class="contract-input" style="width: 280px" placeholder="请填写银行账号" /><br />
              开户行：<input v-model="c.bankBranch" class="contract-input" style="width: 280px" placeholder="请填写开户行" />
            </div>

            <!-- 五、增值税发票 -->
            <h3 class="contract-section">五、增值税专用发票开票信息：</h3>
            <p class="contract-text">乙方在收到甲方通知乙方开具发票时，乙方须在3个工作日内按本合同中甲方要求的开票信息为甲方开具增值税专用发票，开票信息如下：</p>
            <div class="contract-text" style="padding-left: 16px">
              名称：上海掇骁贸易有限公司<br/>
              税号：91310109MACHK7GN2R<br/>
              开户行：中信银行黄浦支行 8110201012001655475<br/>
              联系地址：上海市虹口区同心路723号13幢5321室 13917000290
            </div>

            <!-- 六~九 -->
            <h3 class="contract-section">六、甲方的权利与责任：</h3>
            <p class="contract-text">1) 合同签署后甲方须及时向乙方支付采购订金，并按合同约定时间及时向乙方支付采购货物的尾款。</p>
            <p class="contract-text">2) 甲方须在乙方完成货物生产后，及时对货物进行验收。</p>

            <h3 class="contract-section">七、乙方的权利与责任：</h3>
            <p class="contract-text">1) 确保货物的规格质量与货物生产前寄给甲方的各批次产品对应的产前样品相符，并符合上述产品规格和尺寸说明的标准及成品要求。</p>
            <p class="contract-text">2) 确保甲方在完成采购订金的支付后，乙方按本合同中约定的时间按时完成货物的生产与包装。</p>
            <p class="contract-text">3) 如乙方未遵守上述约定，则甲方有权利要求乙方退或更换该次采购的部分或全部货品。</p>

            <h3 class="contract-section">八、法律适用与争议的解决</h3>
            <p class="contract-text">1) 本合同的有效性、解释、执行及争议解决适用中华人民共和国的法律和法规。</p>
            <p class="contract-text">2) 因履行本合同产生的或与本合同有关的任何争议，应由甲乙双方友好协商解决，协商不成的，任何一方有权将争议提交原告方住所地人民法院解决。</p>

            <h3 class="contract-section">九、合同生效、变更及终止</h3>
            <p class="contract-text">1) 本合同未尽事宜，双方可另行订立补充合同。本合同补充合同、附件、附录、合同订单为本合同不可分割的有效组成部分，与本合同具有同等的法律效力。</p>
            <p class="contract-text">2) 本合同一式两份，甲乙双方各执一份，具有同等法律效力。</p>

            <!-- 签章区 -->
            <div class="contract-sign">
              <div class="sign-col"><p><strong>甲方（盖章）：</strong></p><p style="margin-top: 48px">日期：</p></div>
              <div class="sign-col"><p><strong>乙方（盖章）：</strong></p><p style="margin-top: 48px">日期：</p></div>
            </div>
            <div style="text-align: center; margin-top: 16px; font-size: 12px; color: var(--color-text-muted)">上海掇骁贸易有限公司</div>

            <div style="text-align: right; margin-top: 20px; padding-top: 16px; border-top: 1px dashed var(--color-border)">
              <el-button @click="saveContract(ci)" :loading="isSaving(c)">保存此份草稿</el-button>
              <el-button type="warning" @click="pushContract(ci)" :loading="isPushing(c)" :disabled="!canPushConfirm(c)">
                {{ pushButtonLabel(c) }}
              </el-button>
              <el-button type="primary" @click="exportContract(ci)">导出此份合同 Word</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchProductList } from '../../services/product'
import { pushContractConfirm, updateContract } from '../../services/contract'
import { generateOrder as generateOrderApi } from '../../services/order'
import { buildContractWord } from '../../utils/contractWord'
import { getContractStatusLabel, getContractStatusTagType, getSupplierConfirmStatusLabel, getSupplierConfirmStatusTagType } from '../../utils/status'
import { saveAs } from 'file-saver'
import { Packer } from 'docx'

const products = ref([])
const selectedProductId = ref('')
const selectedProduct = ref(null)
const totalQty = ref(1000)
const skuRows = ref([])
const contracts = ref([])
const activeContract = ref('0')
const savingAll = ref(false)
const pushingAll = ref(false)
const savingMap = ref({})
const pushingMap = ref({})

const checkedSkus = computed(() => skuRows.value.filter(r => r.checked))
const allocatedTotal = computed(() => checkedSkus.value.reduce((s, r) => s + (r.qty || 0), 0))
const remainQty = computed(() => totalQty.value - allocatedTotal.value)

onMounted(async () => {
  try {
    const result = await fetchProductList({ page: 1, pageSize: 200 })
    products.value = result.list || []
  } catch (e) {
    ElMessage.error('加载产品列表失败')
  }
})

function statusLabel(status) {
  return getContractStatusLabel(status)
}

function statusTagType(status) {
  return getContractStatusTagType(status)
}

function supplierConfirmLabel(status) {
  return getSupplierConfirmStatusLabel(status)
}

function supplierConfirmTagType(status) {
  return getSupplierConfirmStatusTagType(status)
}

function isSaving(contract) {
  return Boolean(savingMap.value[contract._savedId])
}

function isPushing(contract) {
  return Boolean(pushingMap.value[contract._savedId])
}

function canPushConfirm(contract) {
  return ['DRAFT', 'PENDING_SIGN'].includes(contract._status) && contract._supplierConfirmStatus !== 'CONFIRMED'
}

function pushButtonLabel(contract) {
  return contract._supplierConfirmStatus === 'PENDING_CONFIRM' ? '重新推送确认' : '推送给供应商确认'
}

async function onProductChange(productId) {
  contracts.value = []
  if (!productId) { selectedProduct.value = null; skuRows.value = []; return }

  const product = products.value.find(p => p._id === productId)
  selectedProduct.value = product

  skuRows.value = (product.skus || []).map(sku => ({
    ...sku,
    checked: true,
    qty: 0
  }))
}

function selectAll() { skuRows.value.forEach(r => r.checked = true); recalcLastSku() }
function deselectAll() { skuRows.value.forEach(r => { r.checked = false; r.qty = 0 }) }

function onSkuCheckChange(row) {
  if (!row.checked) row.qty = 0
  recalcLastSku()
}

function isLastChecked(idx) {
  const checkedIndices = skuRows.value.map((r, i) => r.checked ? i : -1).filter(i => i >= 0)
  return checkedIndices.length > 0 && checkedIndices[checkedIndices.length - 1] === idx
}

function recalcLastSku() {
  const checked = skuRows.value.filter(r => r.checked)
  if (checked.length === 0) return
  const last = checked[checked.length - 1]
  const othersTotal = checked.filter(r => r !== last).reduce((s, r) => s + (r.qty || 0), 0)
  last.qty = Math.max(0, totalQty.value - othersTotal)
}

// === Generate contracts ===
async function generateOrder() {
  const checked = skuRows.value.filter(r => r.checked && r.qty > 0)
  if (checked.length === 0) {
    ElMessage.warning('请先选择至少一个 SKU 并填写数量')
    return
  }

  try {
    const result = await generateOrderApi({
      productId: selectedProductId.value,
      totalQty: totalQty.value,
      skuAllocations: checked.map(item => ({
        skuId: item.sku_id,
        qty: item.qty
      }))
    })

    contracts.value = (result.contracts || []).map(contract => {
      const mergedItems = mergeItems((contract.items || []).map(item => ({
        skuId: item.sku_id,
        skuSpec: item.sku_spec,
        partTypeId: item.part_type_id,
        partName: item.part_name,
        variant: item.sku_spec || '',
        totalQty: item.quantity,
        unitPrice: item.unit_price
      })))
      const deliveryCols = mergedItems.map(item => item.partName)

      return {
        orgId: contract.supplierOrgId,
        contractNo: contract.contractNo,
        supplierName: contract.supplierName || '',
        legalPerson: contract.legalPerson || '',
        creditCode: contract.creditCode || '',
        address: contract.address || '',
        phone: contract.phone || '',
        productDesc: getProductDesc((contract.items || []).map(item => ({
          partName: item.part_name
        }))),
        productItems: mergedItems.map(item => ({
          partName: item.partName,
          weight: '',
          colors: item.colors,
          qtyDetail: item.qtyDetail,
          totalQty: item.totalQty,
          unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
          totalPrice: '',
          sourceItems: item.sourceItems
        })),
        rawMaterials: '',
        depositRate: '30',
        balanceRate: '70',
        bankName: contract.bankInfo?.bank_name || contract.supplierName || '',
        bankAccount: contract.bankInfo?.bank_account || '',
        bankBranch: contract.bankInfo?.bank_branch || '',
        deliveryCols,
        deliveryRows: [buildEmptyDeliveryRow(deliveryCols)],
        _productId: contract.productId,
        _productName: contract.productName,
        _status: contract.status || 'DRAFT',
        _supplierConfirmStatus: contract.supplierConfirmStatus || 'UNSENT',
        _savedId: contract.contractId,
        _items: contract.items || []
      }
    })

    activeContract.value = '0'
    ElMessage.success(`已生成 ${contracts.value.length} 份草稿合同`)
  } catch (error) {
    ElMessage.error(error.message || '生成订单失败')
  }
}

function mergeItems(items) {
  const map = {}
  items.forEach(item => {
    const key = item.partName
    if (!map[key]) {
      map[key] = { partName: item.partName, totalQty: 0, skuDetails: [], colors: new Set(), unitPrice: item.unitPrice, sourceItems: [] }
    }
    map[key].totalQty += item.totalQty
    map[key].skuDetails.push(`${item.variant || item.skuId}：${item.totalQty}件`)
    if (item.variant) map[key].colors.add(item.variant.replace(/.*-/, ''))
    map[key].sourceItems.push(item)
  })
  return Object.values(map).map(m => ({
    partName: m.partName,
    totalQty: m.totalQty,
    colors: [...m.colors].join('、') || '-',
    qtyDetail: m.skuDetails.join('\n'),
    unitPrice: m.unitPrice,
    sourceItems: m.sourceItems
  }))
}

function getProductDesc(items) {
  const partNames = new Set()
  items.forEach(item => {
    const category = item.partName.replace(/[-—].*$/, '').replace(/\d+.*$/, '')
    partNames.add(category)
  })
  return [...partNames].join('、') || '配件'
}

// Delivery plan helpers
function buildEmptyDeliveryRow(cols) {
  const qtys = {}
  cols.forEach(col => { qtys[col] = 0 })
  return { date: '', qtys, rowTotal: 0 }
}

function addDeliveryRow(c) {
  c.deliveryRows.push(buildEmptyDeliveryRow(c.deliveryCols))
}

function calcDeliveryRowTotal(row, cols) {
  row.rowTotal = cols.reduce((sum, col) => sum + (Number(row.qtys[col]) || 0), 0)
}

function calcDeliveryColTotal(c, col) {
  return c.deliveryRows.reduce((sum, row) => sum + (Number(row.qtys[col]) || 0), 0)
}

function calcDeliveryGrandTotal(c) {
  return c.deliveryRows.reduce((sum, row) => sum + (row.rowTotal || 0), 0)
}

// Price calculation
function calcItemAmount(item) {
  const price = parseFloat(item.unitPrice)
  if (!price || isNaN(price)) return '自动计算'
  const amount = price * item.totalQty
  return amount.toLocaleString() + ' 元'
}

function calcItemTotal() { /* trigger reactivity */ }

function calcGrandTotal(c) {
  let total = 0
  let allPriced = true
  for (const item of c.productItems) {
    const price = parseFloat(item.unitPrice)
    if (!price || isNaN(price)) { allPriced = false; continue }
    total += price * item.totalQty
  }
  if (!allPriced && total === 0) return '待填写单价后自动计算'
  return total.toLocaleString() + ' 元'
}

// === Save to DB ===
async function saveAllContracts() {
  savingAll.value = true
  try {
    for (let i = 0; i < contracts.value.length; i += 1) {
      await saveContract(i, false)
    }
    ElMessage.success(`已保存 ${contracts.value.length} 份合同草稿`)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingAll.value = false
  }
}

async function saveContract(index, showMessage = true) {
  const c = contracts.value[index]
  if (!c) return

  savingMap.value = { ...savingMap.value, [c._savedId]: true }
  try {
    const updatedContract = await updateContract(c._savedId, buildContractUpdatePayload(c))
    applyContractState(c, updatedContract)
    if (showMessage) {
      ElMessage.success(`已保存 ${c.supplierName} 合同草稿`)
    }
  } finally {
    const nextMap = { ...savingMap.value }
    delete nextMap[c._savedId]
    savingMap.value = nextMap
  }
}

async function pushContract(index, showMessage = true) {
  const c = contracts.value[index]
  if (!c || !canPushConfirm(c)) return

  pushingMap.value = { ...pushingMap.value, [c._savedId]: true }
  try {
    await saveContract(index, false)
    const result = await pushContractConfirm(c._savedId)
    c._status = result.status || 'PENDING_SIGN'
    c._supplierConfirmStatus = result.supplierConfirmStatus || 'PENDING_CONFIRM'
    if (showMessage) {
      ElMessage.success(`${c.supplierName} 合同已推送给供应商确认`)
    }
  } catch (e) {
    if (showMessage) {
      ElMessage.error(e.message || '推送确认失败')
    }
    throw e
  } finally {
    const nextMap = { ...pushingMap.value }
    delete nextMap[c._savedId]
    pushingMap.value = nextMap
  }
}

async function pushAllContracts() {
  pushingAll.value = true
  try {
    for (let i = 0; i < contracts.value.length; i += 1) {
      if (canPushConfirm(contracts.value[i])) {
        await pushContract(i, false)
      }
    }
    ElMessage.success('已完成全部合同推送确认')
  } catch (e) {
    ElMessage.error(e.message || '批量推送确认失败')
  } finally {
    pushingAll.value = false
  }
}

// === Word export ===
function exportContract(idx) {
  const c = contracts.value[idx]
  const doc = buildContractWord(c)
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${c.contractNo}.docx`)
  })
}

function exportAllContracts() {
  contracts.value.forEach((_, i) => {
    setTimeout(() => exportContract(i), i * 500)
  })
}

function findProductItem(contract, partName) {
  return (contract.productItems || []).find(item => item.partName === partName)
}

function buildContractUpdatePayload(contract) {
  const depositRatio = parseFloat(contract.depositRate) / 100 || 0.3
  const totalAmount = contract.productItems.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice) || 0
    return sum + price * item.totalQty
  }, 0)

  return {
    contract_no: contract.contractNo,
    total_amount: totalAmount,
    deposit_ratio: depositRatio,
    final_ratio: 1 - depositRatio,
    items: (contract._items || []).map((item) => ({
      ...item,
      unit_price: parseFloat(findProductItem(contract, item.part_name)?.unitPrice) || 0,
      amount: (parseFloat(findProductItem(contract, item.part_name)?.unitPrice) || 0) * (item.quantity || 0)
    })),
    supplier_legal_person: contract.legalPerson,
    supplier_credit_code: contract.creditCode,
    supplier_address: contract.address,
    supplier_phone: contract.phone,
    supplier_bank_name: contract.bankName,
    supplier_bank_account: contract.bankAccount,
    supplier_bank_branch: contract.bankBranch,
    product_desc: contract.productDesc,
    raw_materials: contract.rawMaterials,
    delivery_rows: contract.deliveryRows
  }
}

function applyContractState(targetContract, updatedContract) {
  targetContract.contractNo = updatedContract.contract_no || targetContract.contractNo
  targetContract._status = updatedContract.status || targetContract._status || 'DRAFT'
  targetContract._supplierConfirmStatus = updatedContract.supplier_confirm_status || targetContract._supplierConfirmStatus || 'UNSENT'
}
</script>

<style scoped>
.contract-state-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.contract-state-left,
.contract-state-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-doc {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  padding: 48px 56px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  font-family: 'SimSun', 'Songti SC', serif;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
}
.contract-header { text-align: center; margin-bottom: 24px; }
.contract-number { text-align: right; font-size: 13px; color: #666; margin-bottom: 16px; }
.contract-title { font-size: 22px; letter-spacing: 8px; font-weight: 700; }
.contract-parties { margin-bottom: 16px; }
.party-row { margin-bottom: 4px; }
.party-label { color: #666; }
.party-value { font-weight: 500; }
.contract-text { margin-bottom: 8px; text-indent: 2em; text-align: justify; }
.contract-section { font-size: 14px; font-weight: 700; margin: 20px 0 8px; }

.contract-input {
  border: none; border-bottom: 1px solid #1A56DB; background: #EFF6FF;
  padding: 2px 8px; font-size: 14px; font-family: inherit; color: #1A56DB;
  outline: none; border-radius: 0;
}
.contract-input:focus { border-bottom-color: #DC2626; background: #FEF2F2; }
.contract-input-sm {
  border: none; border-bottom: 1px solid #1A56DB; background: #EFF6FF;
  padding: 2px 6px; font-size: 13px; font-family: inherit; color: #1A56DB;
  outline: none; width: 100px; border-radius: 0; text-align: center;
}
.contract-textarea {
  width: 100%; border: 1px solid #E5E7EB; background: #FAFAFA; padding: 8px;
  font-size: 13px; font-family: inherit; min-height: 60px; resize: vertical;
  border-radius: 4px; outline: none;
}
.contract-textarea:focus { border-color: #1A56DB; background: #EFF6FF; }

.contract-table {
  width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px;
}
.contract-table th, .contract-table td {
  border: 1px solid #999; padding: 8px; text-align: center; vertical-align: top;
}
.contract-table th { background: #F3F4F6; font-weight: 600; }
.total-row td { background: #FFFBEB; }

.delivery-table input { font-size: 12px; }

.contract-sign {
  display: flex; justify-content: space-between; margin-top: 40px; padding-top: 24px;
}
.sign-col { width: 45%; }
</style>
