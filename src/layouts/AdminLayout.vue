<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">📦</span>
        <div>
          <span class="logo-text">Zakkart</span>
          <span class="logo-sub">供应链管理系统</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div style="padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #6B7280;">
        正式开发中 · 阶段 0 基础设施
      </div>
    </aside>
    <div class="main-content">
      <header class="top-bar">
        <span class="page-title">{{ currentTitle }}</span>
        <div class="user-info">
          <span>{{ authStore.displayName }}</span>
          <el-tag type="primary" size="small">{{ authStore.roleLabel }}</el-tag>
          <el-button text @click="handleLogout">退出</el-button>
        </div>
      </header>
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems = [
  { path: '/dashboard', label: '系统首页', icon: '🏠' },
  { path: '/products', label: '产品管理', icon: '📋' },
  { path: '/suppliers', label: '供应商管理', icon: '🏭' },
  { path: '/orders', label: '订单生成', icon: '📝' },
  { path: '/contracts', label: '合同管理', icon: '📄' },
  { path: '/quality', label: '质检管理', icon: '🔎' },
  { path: '/shipments', label: '发货管理', icon: '🚚' },
  { path: '/freight', label: '货代单据', icon: '📦' },
  { path: '/addresses', label: '地址管理', icon: '📍' },
  { path: '/inventory', label: '库存管理', icon: '📊' },
  { path: '/notifications', label: '通知中心', icon: '🔔' },
  { path: '/settings', label: '系统设置', icon: '⚙️' },
]

const currentTitle = computed(() => route.meta.title || 'Zakkart')

function isActive(path) {
  return route.path.startsWith(path)
}

function handleLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>
