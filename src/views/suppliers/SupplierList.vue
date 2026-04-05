<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header><span style="font-weight: 600">🏭 供应商列表</span></template>
      <el-table :data="suppliers" border stripe>
        <el-table-column type="index" width="50" label="#" />
        <el-table-column prop="name" label="公司名称" min-width="240">
          <template #default="{ row }">
            <span style="font-weight: 600">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="creditCode" label="统一社会信用代码" width="220">
          <template #default="{ row }">
            <code style="font-size: 12px">{{ row.creditCode }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="legalPerson" label="企业法人" width="100" />
        <el-table-column label="负责配件" width="200">
          <template #default="{ row }">
            <el-tag v-for="pt in row.partTypes" :key="pt" size="small" style="margin: 2px">
              {{ partTypeLabels[pt] || pt }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="覆盖产品" width="220">
          <template #default="{ row }">
            <el-tag v-for="code in row.productCodes" :key="code" type="info" size="small" style="margin: 2px">
              {{ code }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="合作说明" min-width="280" />
        <el-table-column label="状态" width="80" align="center">
          <template #default><el-tag type="success" size="small">合作中</el-tag></template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { suppliers } from '../../data/suppliers.js'

const partTypeLabels = {
  cushion: '垫子', frame: '铁架', suction: '吸盘', wood: '实木',
  plastic: '塑料', disc: '孔盘', packaging: '包装'
}
</script>
