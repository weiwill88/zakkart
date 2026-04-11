Component({
  properties: {
    currentKey: {
      type: String,
      value: 'home'
    }
  },

  data: {
    items: []
  },

  lifetimes: {
    attached() {
      this.updateItems()
    }
  },

  pageLifetimes: {
    show() {
      this.updateItems()
    }
  },

  methods: {
    updateItems() {
      const app = getApp()
      const role = app.getRole()
      if (role !== 'supplier' && role !== 'supplier_worker') {
        this.setData({ items: [] })
        return
      }

      const access = app.getSupplierModuleAccess()
      const items = [
        {
          key: 'home',
          icon: '🏠',
          label: '首页',
          path: '/pages/home/supplier/index'
        }
      ]

      if (access.contract) {
        items.push({
          key: 'contract',
          icon: '📄',
          label: '合同交付',
          path: '/pages/contract/list/index'
        })
      }

      if (access.production) {
        items.push({
          key: 'production',
          icon: '🏭',
          label: '生产验货',
          path: '/pages/quality/list/index'
        })
      }

      if (access.shipping) {
        items.push({
          key: 'shipping',
          icon: '🚚',
          label: '发货物流',
          path: '/pages/shipping/list/index'
        })
      }

      items.push({
        key: 'settings',
        icon: '👤',
        label: '我的',
        path: '/pages/settings/index'
      })

      this.setData({
        items: items.map(item => ({
          ...item,
          active: item.key === this.properties.currentKey
        }))
      })
    },

    onNavigate(e) {
      const { path, key } = e.currentTarget.dataset
      if (!path || key === this.properties.currentKey) {
        return
      }

      wx.reLaunch({
        url: path,
        fail: () => {}
      })
    }
  }
})
