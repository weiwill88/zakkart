<template>
  <div>
    <!-- 库存总览统计 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">FBA 在售 SKU</div>
          <div class="stat-value" style="color: var(--color-primary)">{{ fbaInventory.length }}</div>
          <div class="stat-sub">亚马逊端监控</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">库存紧急预警</div>
          <div class="stat-value" style="color: var(--color-danger)">{{ criticalCount }}</div>
          <div class="stat-sub">5天内断货风险</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">供应商在制品</div>
          <div class="stat-value" style="color: var(--color-warning)">{{ totalWip.toLocaleString() }}</div>
          <div class="stat-sub">正在生产中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-label">仓库成品</div>
          <div class="stat-value" style="color: var(--color-success)">{{ totalFinished.toLocaleString() }}</div>
          <div class="stat-sub">可组装/可发货</div>
        </div>
      </el-col>
    </el-row>

    <!-- Tabs 切换 -->
    <el-tabs v-model="activeTab" type="border-card">
      <!-- Tab 1: FBA 库存 -->
      <el-tab-pane label="🛒 亚马逊 FBA 库存" name="fba">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px" show-icon>
          <template #title><strong>数据来源说明</strong></template>
          <span style="font-size: 13px">
            当前为模拟数据。正式版将通过 <strong>Amazon SP-API (Selling Partner API)</strong> 自动拉取 FBA 实时库存、日销量和补货建议。
            接入后该页面数据将每日自动刷新。
          </span>
        </el-alert>

        <el-table :data="fbaInventory" border stripe style="width: 100%" :default-sort="{ prop: 'daysOfSupply', order: 'ascending' }">
          <el-table-column prop="sku" label="SKU" width="160">
            <template #default="{ row }">
              <span style="font-weight: 600">{{ row.sku }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="asin" label="ASIN" width="150">
            <template #default="{ row }">
              <code style="font-size: 11px; background: #F3F4F6; padding: 2px 6px; border-radius: 3px">{{ row.asin }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="产品名称" min-width="180" />
          <el-table-column prop="stock" label="FBA 库存" width="110" align="center" sortable>
            <template #default="{ row }">
              <span style="font-weight: 700; font-size: 16px">{{ row.stock }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="dailySales" label="日均销量" width="100" align="center" sortable>
            <template #default="{ row }">{{ row.dailySales }} 件/天</template>
          </el-table-column>
          <el-table-column prop="daysOfSupply" label="可售天数" width="120" align="center" sortable>
            <template #default="{ row }">
              <span :style="{ fontWeight: 700, fontSize: '16px', color: daysColor(row.status) }">{{ row.daysOfSupply }} 天</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small" effect="dark">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="建议" width="160">
            <template #default="{ row }">
              <span v-if="row.status === 'critical'" style="color: var(--color-danger); font-size: 13px; font-weight: 500">⚡ 紧急补货</span>
              <span v-else-if="row.status === 'warning'" style="color: var(--color-warning); font-size: 13px">📦 计划补货</span>
              <span v-else style="color: var(--color-text-muted); font-size: 13px">库存充足</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab 2: 供应商库存 -->
      <el-tab-pane label="🏭 供应商端库存" name="supplier">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px" show-icon>
          <template #title><strong>数据来源说明</strong></template>
          <span style="font-size: 13px">
            当前为模拟数据。正式版中，供应商通过<strong>小程序端</strong>实时上报在制品、半成品和成品数量。
            管理员可在此查看各供应商的生产进度和可发货数量。
          </span>
        </el-alert>

        <el-table :data="supplierInventory" border stripe>
          <el-table-column prop="supplierName" label="供应商" width="130" />
          <el-table-column label="配件类型" width="110">
            <template #default="{ row }">
              <el-tag size="small" :class="partTagClass(row.partType)">{{ partLabel(row.partType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="partName" label="配件名称" min-width="200" />
          <el-table-column label="在制品" width="100" align="center">
            <template #default="{ row }">
              <span style="color: var(--color-warning); font-weight: 600">{{ row.wip.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column label="半成品" width="100" align="center">
            <template #default="{ row }">
              <span>{{ row.semiFinished.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column label="成品(可发)" width="110" align="center">
            <template #default="{ row }">
              <span style="color: var(--color-success); font-weight: 700; font-size: 16px">{{ row.finished.toLocaleString() }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="contractBatch" label="关联合同/批次" width="150" />
          <el-table-column prop="note" label="备注" min-width="120" />
        </el-table>
      </el-tab-pane>

      <!-- Tab 3: 仓库库存 -->
      <el-tab-pane label="📦 组装仓库存" name="warehouse">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px" show-icon>
          <template #title><strong>数据来源说明</strong></template>
          <span style="font-size: 13px">
            当前为模拟数据。正式版中，仓库操作员通过<strong>小程序端</strong>录入收货、包装和出库数据，该页面实时更新。
          </span>
        </el-alert>

        <el-row :gutter="20">
          <!-- 配件库存 -->
          <el-col :span="14">
            <el-card shadow="never" style="margin-bottom: 16px">
              <template #header><span style="font-weight: 600">🔧 配件库存</span></template>
              <el-table :data="warehouseInventory.parts" border size="small" max-height="400">
                <el-table-column prop="warehouse" label="仓库" width="120" />
                <el-table-column label="配件类型" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" :class="partTagClass(row.partType)">{{ partLabel(row.partType) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="partName" label="配件名称" min-width="160" />
                <el-table-column label="数量" width="100" align="center">
                  <template #default="{ row }">
                    <span :style="{ fontWeight: 700, color: row.qty === 0 ? 'var(--color-danger)' : 'var(--color-text)' }">
                      {{ row.qty.toLocaleString() }}
                    </span>
                    <span style="font-size: 12px; color: var(--color-text-muted)"> {{ row.unit }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="" width="50" align="center">
                  <template #default="{ row }">
                    <span v-if="row.qty === 0">🔴</span>
                    <span v-else-if="row.qty < 500">🟡</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>

          <!-- 成品库存 -->
          <el-col :span="10">
            <el-card shadow="never" style="margin-bottom: 16px">
              <template #header><span style="font-weight: 600">📦 成品库存</span></template>
              <el-table :data="warehouseInventory.finished" border size="small" max-height="400">
                <el-table-column prop="sku" label="SKU" width="100">
                  <template #default="{ row }">
                    <span style="font-weight: 600">{{ row.sku }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="productName" label="产品" min-width="130" />
                <el-table-column label="库存" width="80" align="center">
                  <template #default="{ row }">
                    <span :style="{ fontWeight: 700, color: row.qty < row.alertThreshold ? 'var(--color-danger)' : 'var(--color-success)' }">
                      {{ row.qty }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="阈值" width="60" align="center">
                  <template #default="{ row }">
                    <span style="color: var(--color-text-muted); font-size: 12px">{{ row.alertThreshold }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="" width="40" align="center">
                  <template #default="{ row }">
                    <span v-if="row.qty === 0">🔴</span>
                    <span v-else-if="row.qty < row.alertThreshold">⚠️</span>
                    <span v-else>✅</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- Tab 4: 可组装量预测 -->
      <el-tab-pane label="🧮 可组装量预测" name="forecast">
        <el-alert type="success" :closable="false" style="margin-bottom: 16px" show-icon>
          <template #title><strong>智能分析：基于 BOM 的"木桶效应"计算</strong></template>
          <span style="font-size: 13px">
            系统根据当前仓库配件库存量和每个 SKU 的 BOM 构成，自动计算各 SKU 的最大可组装数量。
            <strong>瓶颈配件</strong> = 最先耗尽的配件，决定了最大产出。
          </span>
        </el-alert>

        <el-table :data="assemblyForecast" border stripe>
          <el-table-column prop="sku" label="SKU 组合" min-width="350">
            <template #default="{ row }">
              <span style="font-weight: 600">{{ row.sku }}</span>
            </template>
          </el-table-column>
          <el-table-column label="最大可组装" width="140" align="center">
            <template #default="{ row }">
              <span style="font-weight: 700; font-size: 20px; color: var(--color-primary)">{{ row.maxAssembly }}</span>
              <span style="font-size: 12px; color: var(--color-text-muted)"> 套</span>
            </template>
          </el-table-column>
          <el-table-column label="瓶颈配件" width="180">
            <template #default="{ row }">
              <el-tag type="danger" size="small">⚡ {{ row.bottleneck }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="瓶颈库存" width="120" align="center">
            <template #default="{ row }">
              <span style="font-weight: 600; color: var(--color-danger)">{{ row.bottleneckQty }}</span>
            </template>
          </el-table-column>
          <el-table-column label="受限原因" width="200">
            <template #default="{ row }">
              <span style="font-size: 13px; color: var(--color-text-secondary)">{{ row.limitedBy }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fbaInventory, supplierInventory, warehouseInventory, assemblyForecast } from '../../data/inventory.js'

const activeTab = ref('fba')

const criticalCount = computed(() => fbaInventory.filter(i => i.status === 'critical').length)
const totalWip = computed(() => supplierInventory.reduce((sum, i) => sum + i.wip, 0))
const totalFinished = computed(() => warehouseInventory.finished.reduce((sum, i) => sum + i.qty, 0))

function daysColor(status) {
  if (status === 'critical') return 'var(--color-danger)'
  if (status === 'warning') return 'var(--color-warning)'
  return 'var(--color-success)'
}

function statusTagType(status) {
  if (status === 'critical') return 'danger'
  if (status === 'warning') return 'warning'
  return 'success'
}

function statusText(status) {
  if (status === 'critical') return '紧急'
  if (status === 'warning') return '注意'
  return '正常'
}

const partLabels = { cushion: '垫子', frame: '铁架', suction: '吸盘', wood: '实木', plastic: '塑料', disc: '孔盘', packaging: '包装' }
const partTags = { cushion: 'tag-cushion', frame: 'tag-frame', suction: 'tag-suction', wood: 'tag-wood', plastic: 'tag-plastic', disc: 'tag-disc', packaging: 'tag-packaging' }
function partLabel(type) { return partLabels[type] || type }
function partTagClass(type) { return `part-type-tag ${partTags[type] || ''}` }
</script>
