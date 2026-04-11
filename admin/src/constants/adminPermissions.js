export const ADMIN_PERMISSION_OPTIONS = [
  { key: 'module_dashboard', label: '工作台' },
  { key: 'module_product', label: '产品管理' },
  { key: 'module_part_type', label: '配件管理' },
  { key: 'module_supplier', label: '供应商管理' },
  { key: 'module_order', label: '订单生成' },
  { key: 'module_contract', label: '合同管理' },
  { key: 'module_quality', label: '质检管理' },
  { key: 'module_inventory', label: '库存管理' },
  { key: 'module_shipment', label: '发货管理' },
  { key: 'module_freight', label: '货代管理' },
  { key: 'module_notification', label: '通知中心' },
  { key: 'module_admin_user', label: '甲方权限管理' }
]

export const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSION_OPTIONS.map((item) => item.key)

export function normalizeGrantedAdminPermissions(permissions = []) {
  return new Set(
    (permissions || [])
      .filter((item) => {
        if (!item) return false
        if (typeof item === 'string') return true
        return item.granted !== false
      })
      .map((item) => (typeof item === 'string' ? item : item.permission_key))
      .filter(Boolean)
  )
}
