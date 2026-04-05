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
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/DashboardView.vue'), meta: { title: '系统首页', menu: true, icon: '🏠' } },
      { path: 'products', name: 'ProductList', component: () => import('../views/products/ProductList.vue'), meta: { title: '产品管理', menu: true, icon: '📦' } },
      { path: 'products/:id', name: 'ProductDetail', component: () => import('../views/products/ProductDetail.vue'), meta: { title: '产品详情' } },
      { path: 'part-types', name: 'PartTypeList', component: () => import('../views/parts/PartTypeList.vue'), meta: { title: '配件主数据', menu: true, icon: '🧩' } },
      { path: 'suppliers', name: 'SupplierList', component: () => import('../views/suppliers/SupplierList.vue'), meta: { title: '供应商管理', menu: true, icon: '🏭' } },
      { path: 'suppliers/:id', name: 'SupplierDetail', component: () => import('../views/suppliers/SupplierDetail.vue'), meta: { title: '供应商详情' } },
      { path: 'orders', name: 'OrderGenerator', component: () => import('../views/orders/OrderGenerate.vue'), meta: { title: '订单生成', menu: true, icon: '📝' } },
      { path: 'contracts', name: 'ContractList', component: () => import('../views/contracts/ContractList.vue'), meta: { title: '合同管理', menu: true, icon: '📄' } },
      { path: 'contracts/:id', name: 'ContractDetail', component: () => import('../views/contracts/ContractDetail.vue'), meta: { title: '合同详情' } },
      { path: 'quality', name: 'QualityList', component: () => import('../views/quality/QualityList.vue'), meta: { title: '质检管理', menu: true, icon: '🔎' } },
      { path: 'quality/:batchPartId', name: 'QualityDetail', component: () => import('../views/quality/QualityDetail.vue'), meta: { title: '验货详情' } },
      { path: 'shipments', name: 'ShipmentList', component: () => import('../views/system/ComingSoonView.vue'), meta: { title: '发货管理', menu: true, icon: '🚚', phase: '阶段 4', description: '发货单、司机 H5、收货确认和货代确认会在阶段 4 统一打通。' } },
      { path: 'freight', name: 'FreightList', component: () => import('../views/system/ComingSoonView.vue'), meta: { title: '货代单据', menu: true, icon: '📦', phase: '阶段 4', description: '货代单据与发货单会一起在物流闭环阶段接入。' } },
      { path: 'addresses', name: 'AddressList', component: () => import('../views/addresses/AddressList.vue'), meta: { title: '地址管理', menu: true, icon: '📍' } },
      { path: 'inventory', name: 'Inventory', component: () => import('../views/system/ComingSoonView.vue'), meta: { title: '库存管理', menu: true, icon: '📊', phase: '阶段 5', description: '库存管理将在收货、组装、出库链路接通后再上线。当前旧版模拟数据已下线，避免与真实主数据混淆。' } },
      { path: 'notifications', name: 'NotificationCenter', component: () => import('../views/system/ComingSoonView.vue'), meta: { title: '通知中心', menu: true, icon: '🔔', phase: '阶段 2', description: '通知中心会在合同和状态流转阶段接入。' } },
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
})

export default router
