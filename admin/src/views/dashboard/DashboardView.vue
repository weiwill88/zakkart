<template>
  <div>
    <div class="page-header">
      <h2>系统首页</h2>
    </div>

    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">当前阶段</div>
          <div class="stat-value" style="color: var(--color-primary)">Phase 3</div>
          <div class="stat-sub">阶段 2 待云端联调，阶段 3 已进入生产与验货</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">云函数联通</div>
          <div class="stat-value" :style="{ color: health.ok ? 'var(--color-success)' : 'var(--color-warning)' }">
            {{ health.ok ? '已接通' : '待部署' }}
          </div>
          <div class="stat-sub">{{ health.message }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">当前登录用户</div>
          <div class="stat-value" style="color: var(--color-text)">{{ authStore.displayName }}</div>
          <div class="stat-sub">{{ authStore.roleLabel }}</div>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">当前可验收主链路</span>
          <el-button text @click="loadHealth">刷新检查</el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item timestamp="阶段 2" placement="top">
          下单生成、合同列表、合同详情、交付批次、Word 导出、已签 PDF 归档已完成，本次已收敛到后端 `order.generate` + 前端直传云存储。
        </el-timeline-item>
        <el-timeline-item timestamp="阶段 3" placement="top">
          已新增 `status.markProduced`、`inspection.list/create`，PC 端“质检管理”已替换为真实待验货列表和验货提交页。
        </el-timeline-item>
        <el-timeline-item timestamp="小程序" placement="top">
          供应商首页、合同列表/详情、验货反馈页已接入真实 API，可查看生产任务并标记“已生产待验货”。
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { callApi } from '../../services/api'

const authStore = useAuthStore()
const health = reactive({
  ok: false,
  message: '尚未检查'
})

async function loadHealth() {
  try {
    const response = await callApi('system.health', {}, { skipAuth: true, anonymousOptional: false })
    health.ok = Boolean(response.ok)
    health.message = `${response.service} @ ${response.env}`
  } catch (error) {
    health.ok = false
    health.message = error.message || '请先部署云函数 api'
  }
}

onMounted(() => {
  loadHealth()
})
</script>
