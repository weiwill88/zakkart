<template>
  <div>
    <!-- Step 1: 选择父 ASIN + 子 ASIN 分配 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">📋 第一步：选择产品并分配数量</span>
          <el-tag type="info">以 Listing（父 ASIN）为单位下单</el-tag>
        </div>
      </template>

      <!-- 选择父 ASIN -->
      <el-form label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="选择产品 Listing（父 ASIN）">
              <el-select v-model="selectedParent" placeholder="选择产品" filterable style="width: 100%" @change="onParentChange">
                <el-option v-for="p in assembledProducts" :key="p.id" :label="`${p.code} · ${p.name} (${p.parentAsin})`" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="采购总数量">
              <el-input-number v-model="totalQty" :min="1" :step="100" style="width: 100%" @change="recalcLastSku" :disabled="!selectedParent" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label=" ">
              <el-button type="primary" icon="MagicStick" @click="generateOrder" :disabled="!selectedParent || totalQty < 1" style="width: 100%">
                生成订单 & 合同
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 子 ASIN 勾选与数量分配 -->
      <div v-if="currentProduct" style="margin-top: 8px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <span style="font-weight: 600; color: var(--color-text-secondary)">
            子 ASIN 列表（共 {{ currentProduct.skus.length }} 个，已选 {{ checkedSkus.length }} 个）
          </span>
          <div>
            <el-button text size="small" @click="selectAll">全选</el-button>
            <el-button text size="small" @click="deselectAll">取消全选</el-button>
            <el-tag style="margin-left: 8px">
              已分配：{{ allocatedTotal }} / {{ totalQty }}
              <span v-if="remainQty > 0" style="color: var(--color-warning)"> · 剩余 {{ remainQty }}</span>
              <span v-else-if="remainQty === 0" style="color: var(--color-success)"> ✓ 已分配完</span>
              <span v-else style="color: var(--color-danger)"> ⚠ 超出 {{ -remainQty }}</span>
            </el-tag>
          </div>
        </div>

        <el-table :data="skuRows" border size="small" style="width: 100%">
          <el-table-column width="50" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.checked" @change="onSkuCheckChange(row)" />
            </template>
          </el-table-column>
          <el-table-column prop="code" label="SKU 编号" width="160">
            <template #default="{ row }">
              <span :style="{ fontWeight: 600, opacity: row.checked ? 1 : 0.4 }">{{ row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column label="子 ASIN" width="150">
            <template #default="{ row }">
              <code style="font-size: 11px; background: #F3F4F6; padding: 2px 6px; border-radius: 3px">{{ row.childAsin }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="spec" label="规格" min-width="180" />
          <el-table-column label="BOM 配件数" width="100" align="center">
            <template #default="{ row }">{{ row.bom.length }} 种</template>
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
        <span style="font-size: 18px; font-weight: 600">📄 合同预览（共 {{ contracts.length }} 份）</span>
        <el-button type="success" icon="Download" @click="exportAllContracts">一键导出全部 Word</el-button>
      </div>

      <el-tabs v-model="activeContract" type="card">
        <el-tab-pane v-for="(c, ci) in contracts" :key="ci" :label="`${c.supplierName.slice(0, 4)}…`" :name="String(ci)">
          <!-- Word 样式合同预览 -->
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
                  <td><input v-model="item.unitPrice" class="contract-input-sm" placeholder="元/件" /></td>
                  <td style="font-weight: 600">{{ item.totalPrice || '自动计算' }}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="6" style="text-align: right; font-weight: 600">合计采购总金额（含税）</td>
                  <td style="font-weight: 700; color: var(--color-danger)">{{ c.grandTotal || '待填写单价后自动计算' }}</td>
                </tr>
              </tbody>
            </table>

            <!-- 成品货物要求 -->
            <p class="contract-text"><strong>1. 成品货物要求：</strong>乙方生产货物的各项尺寸需要同附录一的产品规格和尺寸说明相符且产品颜色需要同甲乙双方确认的产品的产前样色卡相符，同时成品货物不能出现缝合线开线、布料缝合处有毛边、产品本身不整洁、棉花填充不均匀不足量、布料克重材质不达标等明显的质量问题。</p>
            <p class="contract-text"><strong>2. 乙方负责本合同产品生产的原材料有：</strong><textarea v-model="c.rawMaterials" class="contract-textarea" placeholder="请填写乙方需负责的原材料清单" /></p>
            <p class="contract-text"><strong>3.</strong> 货物实际生产时，上述产品尺寸、规格、重量、颜色发生调整改动的以双方认同的产品产前样为准。</p>

            <!-- 二、交付时间 -->
            <h3 class="contract-section">二、产品采购下单方式及产品交付时间：</h3>
            <p class="contract-text">本合同约定的采购产品，乙方承诺按下面的交付计划表完成全部产品的生产和包装工序并可交付甲方提货；</p>
            <div class="delivery-placeholder">
              <div style="text-align: center; padding: 32px; color: var(--color-text-muted)">
                <el-icon size="32"><Calendar /></el-icon>
                <p style="margin-top: 8px">交付计划表（待手动填写）</p>
                <p style="font-size: 12px">导出 Word 后在文档中填写具体的交付日期和各 SKU 的分批数量</p>
              </div>
            </div>

            <!-- 三~九 通用条款 -->
            <h3 class="contract-section">三、产品合格率与产品返工要求：</h3>
            <p class="contract-text">如乙方生产的货品中，有不符合本协议约定的产品标准和要求以及产品包装要求的货品（以下简称"不合格品"），则乙方保证在3个自然日内，对不合格品进行返工重做并承担返工所需的成本费用。且乙方保证本次所生产全部货品的不合格品率（不合格品率=不合格品/采购数量）在1%以下。</p>

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

            <h3 class="contract-section">五、增值税专用发票开票信息：</h3>
            <p class="contract-text">乙方在收到甲方通知乙方开具发票时，乙方须在3个工作日内按本合同中甲方要求的开票信息为甲方开具增值税专用发票，开票信息如下：</p>
            <div class="contract-text" style="padding-left: 16px">
              名称：上海掇骁贸易有限公司<br/>
              税号：91310109MACHK7GN2R<br/>
              开户行：中信银行黄浦支行 8110201012001655475<br/>
              联系地址：上海市虹口区同心路723号13幢5321室 13917000290
            </div>

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
              <div class="sign-col">
                <p><strong>甲方（盖章）：</strong></p>
                <p style="margin-top: 48px">日期：</p>
              </div>
              <div class="sign-col">
                <p><strong>乙方（盖章）：</strong></p>
                <p style="margin-top: 48px">日期：</p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 16px; font-size: 12px; color: var(--color-text-muted)">上海掇骁贸易有限公司</div>

            <!-- 单份导出 -->
            <div style="text-align: right; margin-top: 20px; padding-top: 16px; border-top: 1px dashed var(--color-border)">
              <el-button type="primary" icon="Download" @click="exportContract(ci)">导出此份合同 Word</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Calendar } from '@element-plus/icons-vue'
import { products, PART_TYPES } from '../../data/products.js'
import { suppliers } from '../../data/suppliers.js'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

const selectedParent = ref('')
const totalQty = ref(1000)
const skuRows = ref([])
const contracts = ref([])
const activeContract = ref('0')

const assembledProducts = computed(() => products.filter(p => p.type === 'assembled'))
const currentProduct = computed(() => products.find(p => p.id === selectedParent.value))
const checkedSkus = computed(() => skuRows.value.filter(r => r.checked))
const allocatedTotal = computed(() => checkedSkus.value.reduce((s, r) => s + (r.qty || 0), 0))
const remainQty = computed(() => totalQty.value - allocatedTotal.value)

function onParentChange() {
  contracts.value = []
  if (!currentProduct.value) { skuRows.value = []; return }
  skuRows.value = currentProduct.value.skus.map(sku => ({
    ...sku, checked: true, qty: 0
  }))
  // 均匀分配
  const avg = Math.floor(totalQty.value / skuRows.value.length)
  skuRows.value.forEach((r, i) => {
    r.qty = i === skuRows.value.length - 1 ? totalQty.value - avg * (skuRows.value.length - 1) : avg
  })
}

function onSkuCheckChange(row) {
  if (!row.checked) row.qty = 0
  recalcLastSku()
}

function selectAll() { skuRows.value.forEach(r => r.checked = true); recalcLastSku() }
function deselectAll() { skuRows.value.forEach(r => { r.checked = false; r.qty = 0 }) }

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

function generateOrder() {
  const checked = skuRows.value.filter(r => r.checked && r.qty > 0)
  if (checked.length === 0) return

  // BOM 拆解 → 按供应商分组
  const supplierMap = {}
  checked.forEach(sku => {
    sku.bom.forEach(b => {
      const sup = findSupplier(b.partType, currentProduct.value.code)
      if (!sup) return
      if (!supplierMap[sup.id]) {
        supplierMap[sup.id] = { supplier: sup, items: [] }
      }
      supplierMap[sup.id].items.push({
        sku: sku.code,
        skuQty: sku.qty,
        partType: b.partType,
        partName: b.partName,
        variant: b.variant,
        unitQty: b.qty,
        totalQty: b.qty * sku.qty,
      })
    })
  })

  // 生成合同数据
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  contracts.value = Object.values(supplierMap).map((g, idx) => {
    const sup = g.supplier
    // 按配件名称合并同类项
    const mergedItems = mergeItems(g.items)

    return {
      contractNo: `DX-${sup.id.slice(-3)}-CGHT-${dateStr}-${String(idx + 1).padStart(3, '0')}`,
      supplierName: sup.name,
      legalPerson: sup.legalPerson,
      creditCode: sup.creditCode,
      address: '',
      phone: '',
      productDesc: getPartTypeDesc(sup.partTypes),
      productItems: mergedItems.map(item => ({
        partName: item.partName,
        weight: '',
        colors: item.colors,
        qtyDetail: item.qtyDetail,
        totalQty: item.totalQty,
        unitPrice: '',
        totalPrice: ''
      })),
      rawMaterials: '',
      depositRate: '30',
      balanceRate: '70',
      bankName: sup.name,
      bankAccount: '',
      bankBranch: '',
    }
  })
  activeContract.value = '0'
}

function mergeItems(items) {
  const map = {}
  items.forEach(item => {
    const key = item.partName
    if (!map[key]) {
      map[key] = { partName: item.partName, totalQty: 0, skuDetails: [], colors: new Set() }
    }
    map[key].totalQty += item.totalQty
    map[key].skuDetails.push(`${item.variant || item.sku}：${item.totalQty}件`)
    if (item.variant) map[key].colors.add(item.variant)
  })
  return Object.values(map).map(m => ({
    partName: m.partName,
    totalQty: m.totalQty,
    colors: [...m.colors].join('、') || '-',
    qtyDetail: m.skuDetails.join('\n'),
  }))
}

function findSupplier(partType, productCode) {
  return suppliers.find(s => s.partTypes.includes(partType) && s.productCodes.some(c => productCode.startsWith(c)))
}

function getPartTypeDesc(types) {
  const labels = { cushion: '宠物垫子', frame: '铁架套装', suction: '吸盘', wood: '实木配件', plastic: '塑料配件', disc: '孔盘配件', packaging: '成品包装' }
  return types.map(t => labels[t] || t).join('、')
}

// === Word 导出 ===
function exportContract(idx) {
  const c = contracts.value[idx]
  const doc = buildWordDoc(c)
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${c.contractNo}.docx`)
  })
}

function exportAllContracts() {
  contracts.value.forEach((c, i) => {
    setTimeout(() => exportContract(i), i * 500)
  })
}

function buildWordDoc(c) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '999999' }
  const cellBorders = { top: border, bottom: border, left: border, right: border }

  const sections = []

  // 合同编号
  sections.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `合同编号：${c.contractNo}`, size: 20 })] }))
  // 标题
  sections.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: '采 购 合 同', bold: true, size: 32 })] }))

  // 甲方信息
  const partyLines = [
    '采购方（甲方）：上海掇骁贸易有限公司',
    '法定代表人：闵一',
    '统一社会信用代码：91310109MACHK7GN2R',
    '地址：上海市虹口区同心路723号13幢5321室',
    '联系方式：13262515903', '',
    `供货方（乙方）：${c.supplierName}`,
    `法定代表人：${c.legalPerson}`,
    `统一社会信用代码：${c.creditCode}`,
    `地址：${c.address || '________'}`,
    `联系方式：${c.phone || '________'}`,
  ]
  partyLines.forEach(line => sections.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 60 } })))

  // 前言
  sections.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: `经甲乙双方充分协商，根据《中华人民共和国合同法》及相关法律法规的有关规定，秉承公平、自愿、诚信的合作原则，就甲方向乙方采购${c.productDesc}产品用以生产组装宠物吊床产品的事宜，双方订立本采购合同，并承诺共同遵守。`, size: 22 })] }))

  // 一、采购货物说明
  sections.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: `一、采购货物说明：${c.productDesc}`, bold: true, size: 24 })] }))

  // 产品表格
  const headerRow = new TableRow({
    children: ['产品规格', '产品型号', '产品重量', '产品颜色', '采购数量', '采购单价', '采购金额'].map(h =>
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })], borders: cellBorders })
    )
  })
  const dataRows = c.productItems.map(item =>
    new TableRow({
      children: [
        '以产前样品为准', item.partName, item.weight || '____克/件', item.colors,
        item.qtyDetail.replace(/\n/g, '；'), item.unitPrice ? `${item.unitPrice}元/件` : '____元/件',
        item.totalPrice || '____元'
      ].map(v => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })], borders: cellBorders }))
    })
  )
  sections.push(new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }))

  // 二~九
  const clauseTexts = [
    { title: '二、产品采购下单方式及产品交付时间：', body: '本合同约定的采购产品，乙方承诺按下面的交付计划表完成全部产品的生产和包装工序并可交付甲方提货；\n\n（交付计划表：待填写）' },
    { title: '三、产品合格率与产品返工要求：', body: '如乙方生产的货品中，有不合格品，则乙方保证在3个自然日内对不合格品进行返工重做并承担返工所需的成本费用。且乙方保证不合格品率在1%以下。' },
    { title: '四、支付方式：', body: `甲方承诺在合同签署后，将货物采购订金（采购总金额的${c.depositRate || 30}%）支付至乙方指定银行账户。乙方完成全部货物的生产后，甲方验收并支付剩余${c.balanceRate || 70}%尾款。\n\n乙方收款账户：\n户名：${c.bankName || '________'}\n账户号：${c.bankAccount || '________'}\n开户行：${c.bankBranch || '________'}` },
    { title: '五、增值税专用发票开票信息：', body: '名称：上海掇骁贸易有限公司\n税号：91310109MACHK7GN2R\n开户行：中信银行黄浦支行 8110201012001655475' },
    { title: '六、甲方的权利与责任：', body: '1) 合同签署后及时支付采购订金和尾款。\n2) 及时对货物进行验收。' },
    { title: '七、乙方的权利与责任：', body: '1) 确保货物质量符合产前样品标准。\n2) 按约定时间完成生产与包装。\n3) 如未遵守约定，甲方有权要求退换货。' },
    { title: '八、法律适用与争议的解决', body: '适用中华人民共和国法律，争议协商解决，协商不成提交原告方住所地人民法院。' },
    { title: '九、合同生效、变更及终止', body: '本合同一式两份，甲乙双方各执一份，具有同等法律效力。' },
  ]
  clauseTexts.forEach(cl => {
    sections.push(new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: cl.title, bold: true, size: 22 })] }))
    cl.body.split('\n').forEach(line => {
      sections.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 40 } }))
    })
  })

  // 签章区
  sections.push(new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: '甲方（盖章）：                              乙方（盖章）：', size: 22 })] }))
  sections.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: '日期：                                      日期：', size: 22 })] }))
  sections.push(new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '上海掇骁贸易有限公司', size: 18, color: '999999' })] }))

  return new Document({ sections: [{ children: sections }] })
}
</script>

<style scoped>
/* Word 样式合同 */
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

.delivery-placeholder {
  border: 2px dashed var(--color-border); border-radius: 8px; margin: 12px 0;
  background: #FAFAFA;
}

.contract-sign {
  display: flex; justify-content: space-between; margin-top: 40px; padding-top: 24px;
}
.sign-col { width: 45%; }
</style>
