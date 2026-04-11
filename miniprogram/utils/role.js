// 各角色的首页路径
const roleHomePaths = {
  admin: '/pages/home/admin/index',
  supplier: '/pages/home/supplier/index',
  supplier_worker: '/pages/home/supplier/index',
  logistics: '/pages/home/logistics/index',
  warehouse: '/pages/home/warehouse/index'
}

// 各角色的 TabBar 配置
const roleTabConfigs = {
  admin: [
    { key: 'home', label: '工作台', icon: 'home', pagePath: '/pages/home/admin/index' },
    { key: 'contract', label: '合同', icon: 'contract', pagePath: '/pages/contract/list/index' },
    { key: 'inventory', label: '库存', icon: 'inventory', pagePath: '/pages/inventory/overview/index' },
    { key: 'settings', label: '我的', icon: 'user', pagePath: '/pages/settings/index' }
  ],
  supplier: [
    { key: 'home', label: '首页', icon: 'home', pagePath: '/pages/home/supplier/index' },
    { key: 'contract', label: '合同', icon: 'contract', pagePath: '/pages/contract/list/index' },
    { key: 'shipping', label: '发货', icon: 'shipping', pagePath: '/pages/shipping/list/index' },
    { key: 'settings', label: '我的', icon: 'user', pagePath: '/pages/settings/index' }
  ],
  supplier_worker: [
    { key: 'home', label: '首页', icon: 'home', pagePath: '/pages/home/supplier/index' },
    { key: 'shipping', label: '发货', icon: 'shipping', pagePath: '/pages/shipping/list/index' },
    { key: 'settings', label: '我的', icon: 'user', pagePath: '/pages/settings/index' }
  ],
  logistics: [
    { key: 'home', label: '首页', icon: 'home', pagePath: '/pages/home/logistics/index' },
    { key: 'shipping', label: '运单', icon: 'shipping', pagePath: '/pages/shipping/list/index' },
    { key: 'settings', label: '我的', icon: 'user', pagePath: '/pages/settings/index' }
  ],
  warehouse: [
    { key: 'home', label: '首页', icon: 'home', pagePath: '/pages/home/warehouse/index' },
    { key: 'inventory', label: '库存', icon: 'inventory', pagePath: '/pages/inventory/overview/index' },
    { key: 'packing', label: '包装', icon: 'packing', pagePath: '/pages/warehouse-ops/packing/index' },
    { key: 'settings', label: '我的', icon: 'user', pagePath: '/pages/settings/index' }
  ]
}

// 角色颜色
const roleColors = {
  admin: '#1A56DB',
  supplier: '#059669',
  supplier_worker: '#10B981',
  logistics: '#D97706',
  warehouse: '#7C3AED'
}

const roleManager = {
  getHomePath(role) {
    return roleHomePaths[role] || roleHomePaths.admin
  },

  getTabConfig(role) {
    return roleTabConfigs[role] || roleTabConfigs.admin
  },

  getRoleColor(role) {
    return roleColors[role] || roleColors.admin
  }
}

module.exports = { roleManager }
