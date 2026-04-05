<template>
  <div>
    <div class="page-header">
      <h2>系统首页</h2>
    </div>

    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">当前阶段</div>
          <div class="stat-value" style="color: var(--color-primary)">Phase 0</div>
          <div class="stat-sub">基础设施、认证与正式工程骨架</div>
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
          <span style="font-weight: 600">阶段 0 已落地内容</span>
          <el-button text @click="loadHealth">刷新检查</el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item timestamp="后端" placement="top">
          单入口 `api` 云函数、统一响应格式、开发期短信登录、Token 签发/校验。
        </el-timeline-item>
        <el-timeline-item timestamp="PC 端" placement="top">
          登录页、Pinia 鉴权 Store、CloudBase 调用封装、路由守卫、统一菜单框架。
        </el-timeline-item>
        <el-timeline-item timestamp="小程序" placement="top">
          云开发初始化与 API 封装入口，保留原型角色模式作为开发期兜底。
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
