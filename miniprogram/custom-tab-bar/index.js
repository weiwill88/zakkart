const { roleManager } = require('../utils/role')

Component({
  data: {
    tabs: [],
    currentTab: 'home'
  },

  lifetimes: {
    attached() {
      this.updateTabs()
    }
  },

  pageLifetimes: {
    show() {
      this.updateTabs()
      this.updateCurrentTab()
    }
  },

  methods: {
    updateTabs() {
      const app = getApp()
      const role = app.getRole()
      const tabs = buildTabs(role, app)
      this.setData({ tabs })
    },

    updateCurrentTab() {
      const pages = getCurrentPages()
      if (pages.length === 0) return
      const currentPage = pages[pages.length - 1]
      const currentPath = '/' + currentPage.route
      
      const tabs = this.data.tabs
      for (let i = 0; i < tabs.length; i++) {
        if (currentPath === tabs[i].pagePath) {
          this.setData({ currentTab: tabs[i].key })
          return
        }
      }
    },

    onTabTap(e) {
      const { path, key } = e.currentTarget.dataset
      if (key === this.data.currentTab) return
      
      wx.switchTab({
        url: path,
        fail: () => {
          // 如果不是 tabBar 页面，使用 reLaunch
          wx.reLaunch({ url: path })
        }
      })
    }
  }
})

function buildTabs(role, app) {
  if (role === 'supplier' || role === 'supplier_worker') {
    return []
  }

  const tabs = roleManager.getTabConfig(role)
  if (role !== 'admin') {
    return tabs
  }

  const moduleAccess = app.getAdminModuleAccess()
  const tabPermissionMap = {
    home: moduleAccess.dashboard,
    contract: moduleAccess.contract,
    production: moduleAccess.quality,
    inventory: moduleAccess.inventory,
    settings: true
  }

  return tabs.filter((item) => tabPermissionMap[item.key] !== false)
}
