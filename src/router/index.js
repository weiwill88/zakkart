import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { pinia } from '../stores'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/DashboardView.vue'), meta: { title: '系统首页', menu: true, icon: '🏠', permissionKey: 'module_dashboard' } },
      { path: 'products', name: 'ProductList', component: () => import('../views/products/ProductList.vue'), meta: { title: '产品管理', menu: true, icon: '📦', permissionKey: 'module_product' } },
      { path: 'products/:id', name: 'ProductDetail', component: () => import('../views/products/ProductDetail.vue'), meta: { title: '产品详情', permissionKey: 'module_product' } },
      { path: 'part-types', name: 'PartTypeList', component: () => import('../views/parts/PartTypeList.vue'), meta: { title: '配件管理', menu: true, icon: '🧩', permissionKey: 'module_part_type' } },
      { path: 'suppliers', name: 'SupplierList', component: () => import('../views/suppliers/SupplierList.vue'), meta: { title: '供应商管理', menu: true, icon: '🏭', permissionKey: 'module_supplier' } },
      { path: 'suppliers/:id', name: 'SupplierDetail', component: () => import('../views/suppliers/SupplierDetail.vue'), meta: { title: '供应商详情', permissionKey: 'module_supplier' } },
      { path: 'orders', name: 'OrderGenerator', component: () => import('../views/orders/OrderGenerate.vue'), meta: { title: '订单生成', menu: true, icon: '📝', permissionKey: 'module_order' } },
      { path: 'contracts', name: 'ContractList', component: () => import('../views/contracts/ContractList.vue'), meta: { title: '合同管理', menu: true, icon: '📄', permissionKey: 'module_contract' } },
      { path: 'contracts/:id', name: 'ContractDetail', component: () => import('../views/contracts/ContractDetail.vue'), meta: { title: '合同详情', permissionKey: 'module_contract' } },
      { path: 'quality', name: 'QualityList', component: () => import('../views/quality/QualityList.vue'), meta: { title: '质检管理', menu: true, icon: '🔎', permissionKey: 'module_quality' } },
      { path: 'quality/:batchPartId', name: 'QualityDetail', component: () => import('../views/quality/QualityDetail.vue'), meta: { title: '验货详情', permissionKey: 'module_quality' } },
      { path: 'shipments', name: 'ShipmentList', component: () => import('../views/shipments/ShipmentList.vue'), meta: { title: '发货管理', menu: true, icon: '🚚', permissionKey: 'module_shipment' } },
      { path: 'shipments/:id', name: 'ShipmentDetail', component: () => import('../views/shipments/ShipmentDetail.vue'), meta: { title: '发货单详情', permissionKey: 'module_shipment' } },
      { path: 'freight', name: 'FreightList', component: () => import('../views/freight/FreightList.vue'), meta: { title: '货代单据', menu: true, icon: '📦', permissionKey: 'module_freight' } },
      { path: 'freight-addresses', name: 'FreightAddressList', component: () => import('../views/addresses/AddressList.vue'), meta: { title: '货代地址维护', menu: true, icon: '📍', addressType: 'freight', permissionKey: 'module_freight' } },
      { path: 'inventory', name: 'Inventory', component: () => import('../views/inventory/InventoryView.vue'), meta: { title: '库存管理', menu: true, icon: '📊', permissionKey: 'module_inventory' } },
      { path: 'notifications', name: 'NotificationCenter', component: () => import('../views/notifications/NotificationList.vue'), meta: { title: '通知中心', menu: true, icon: '🔔', permissionKey: 'module_notification' } },
      { path: 'admin-users', name: 'AdminUserList', component: () => import('../views/system/AdminUserList.vue'), meta: { title: '甲方权限管理', menu: true, icon: '🛡️', permissionKey: 'module_admin_user' } },
      { path: 'settings', name: 'Settings', component: () => import('../views/system/ComingSoonView.vue'), meta: { title: '系统设置', menu: true, icon: '⚙️', phase: '阶段 7', description: '系统设置会在后期补齐合同模板和系统参数管理。' } },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)

  document.title = to.meta.title ? `${to.meta.title} - Zakkart` : 'Zakkart 供应链管理系统'

  await authStore.bootstrap()

  if (to.meta.public) {
    if (authStore.isLoggedIn && to.name === 'Login') {
      return { path: '/dashboard' }
    }

    return true
  }

  if (!authStore.isLoggedIn) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    }
  }

  if (authStore.isAdminLike && to.meta.permissionKey && !authStore.hasAdminPermission(to.meta.permissionKey)) {
    const fallbackPath = findFirstAllowedPath(authStore)
    if (to.path !== fallbackPath) {
      return { path: fallbackPath }
    }
  }
})

export default router

function findFirstAllowedPath(authStore) {
  const candidates = [
    { path: '/dashboard', permissionKey: 'module_dashboard' },
    { path: '/quality', permissionKey: 'module_quality' },
    { path: '/contracts', permissionKey: 'module_contract' },
    { path: '/inventory', permissionKey: 'module_inventory' },
    { path: '/shipments', permissionKey: 'module_shipment' },
    { path: '/notifications', permissionKey: 'module_notification' }
  ]

  const match = candidates.find((item) => authStore.hasAdminPermission(item.permissionKey))
  return match?.path || '/dashboard'
}
