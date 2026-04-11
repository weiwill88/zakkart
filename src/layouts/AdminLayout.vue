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
          v-if="authStore.hasAdminPermission('module_dashboard')"
          to="/dashboard"
          class="nav-item nav-item--home"
          :class="{ active: isActive('/dashboard') }"
        >
          <span class="nav-icon">🏠</span>
          <span>系统首页</span>
        </router-link>

        <div v-for="group in menuGroups" :key="group.label" class="nav-group">
          <div class="nav-group-label">{{ group.label }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item nav-item--child"
            :class="{ active: isActive(item.path) }"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footnote">
        正式开发中 · 阶段 4 发货与物流
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

const menuGroups = computed(() => [
  {
    label: '基础资料',
    items: [
      { path: '/products', label: '产品管理', icon: '📋', permissionKey: 'module_product' },
      { path: '/part-types', label: '配件管理', icon: '🧩', permissionKey: 'module_part_type' },
      { path: '/inventory', label: '库存管理', icon: '📊', permissionKey: 'module_inventory' },
      { path: '/suppliers', label: '供应商管理', icon: '🏭', permissionKey: 'module_supplier' }
    ]
  },
  {
    label: '合同与计划',
    items: [
      { path: '/orders', label: '订单生成', icon: '📝', permissionKey: 'module_order' },
      { path: '/contracts', label: '合同管理', icon: '📄', permissionKey: 'module_contract' }
    ]
  },
  {
    label: '生产与质检',
    items: [
      { path: '/quality', label: '质检管理', icon: '🔎', permissionKey: 'module_quality' }
    ]
  },
  {
    label: '物流与发货',
    items: [
      { path: '/shipments', label: '发货管理', icon: '🚚', permissionKey: 'module_shipment' },
      { path: '/freight', label: '货代单据', icon: '📦', permissionKey: 'module_freight' },
      { path: '/freight-addresses', label: '货代地址维护', icon: '📍', permissionKey: 'module_freight' }
    ]
  },
  {
    label: '系统',
    items: [
      { path: '/notifications', label: '通知中心', icon: '🔔', permissionKey: 'module_notification' },
      { path: '/admin-users', label: '甲方权限管理', icon: '🛡️', permissionKey: 'module_admin_user' },
      { path: '/settings', label: '系统设置', icon: '⚙️' }
    ]
  }
]
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permissionKey || authStore.hasAdminPermission(item.permissionKey))
  }))
  .filter((group) => group.items.length > 0))

const currentTitle = computed(() => route.meta.title || 'Zakkart')

function isActive(path) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function handleLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.nav-group + .nav-group {
  margin-top: 18px;
}

.nav-group-label {
  padding: 0 20px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-item--home {
  margin-bottom: 18px;
}

.nav-item--child {
  margin-left: 10px;
}

.sidebar-footnote {
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.08);
  font-size: 11px;
  color: #6B7280;
}
</style>
