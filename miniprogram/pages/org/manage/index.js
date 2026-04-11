const { callApi } = require('../../../utils/api')
const { showToast } = require('../../../utils/util')

const PERMISSION_OPTIONS = [
  { key: 'view_contract_detail', label: '查看合同明细' },
  { key: 'view_contract_amount', label: '查看合同金额' },
  { key: 'confirm_order', label: '确认合同/订单' },
  { key: 'mark_produced', label: '标记已生产' },
  { key: 'create_shipment', label: '创建发货单' },
  { key: 'view_shipment', label: '查看发货单' },
  { key: 'view_inventory', label: '查看库存' },
  { key: 'confirm_receiving', label: '确认收货' },
  { key: 'assembly_operation', label: '组装操作' },
  { key: 'manage_members', label: '成员管理' }
]

Page({
  data: {
    org: null,
    members: [],
    canManageMembers: false,
    permissionOptions: PERMISSION_OPTIONS,
    addPermissionOptions: decoratePermissionOptions(['create_shipment', 'view_shipment']),
    showAddDialog: false,
    showPermissionDialog: false,
    addForm: {
      name: '',
      phone: '',
      role: 'supplier_member',
      permissionKeys: ['create_shipment', 'view_shipment']
    },
    editingMember: null,
    editingPermissions: [],
    editPermissionOptions: decoratePermissionOptions([]),
    saving: false
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    const app = getApp()
    const user = app.getUser() || {}
    const orgId = user.org?.id || ''
    const canManageMembers = app.getSupplierModuleAccess().org

    if (!orgId) {
      showToast('当前账号未绑定组织')
      return
    }

    try {
      const [org, memberResult] = await Promise.all([
        callApi('organization.detail', { id: orgId }),
        callApi('organization.memberList', { orgId }).catch(() => ({ list: [] }))
      ])

      this.setData({
        org: {
          id: org._id,
          name: org.name || '',
          hasAssembly: Boolean(org.has_assembly),
          legalPerson: org.legal_person || '-',
          creditCode: org.credit_code || '-',
          cooperationNote: org.cooperation_note || '暂无',
          bankName: org.bank_info?.bank_name || '-',
          bankAccount: org.bank_info?.bank_account || '-'
        },
        members: (memberResult.list || []).map(buildMemberRow),
        canManageMembers
      })
    } catch (error) {
      showToast(error.message || '加载组织信息失败')
    }
  },

  onOpenAddDialog() {
    if (!this.data.canManageMembers) {
      showToast('当前账号没有成员管理权限')
      return
    }

    this.setData({
      showAddDialog: true,
      addForm: {
        name: '',
        phone: '',
        role: 'supplier_member',
        permissionKeys: ['create_shipment', 'view_shipment']
      },
      addPermissionOptions: decoratePermissionOptions(['create_shipment', 'view_shipment'])
    })
  },

  onCloseAddDialog() {
    this.setData({ showAddDialog: false })
  },

  onAddNameInput(e) {
    this.setData({ 'addForm.name': e.detail.value })
  },

  onAddPhoneInput(e) {
    this.setData({ 'addForm.phone': e.detail.value })
  },

  onAddRoleChange(e) {
    const role = e.detail.value
    const permissionKeys = role === 'supplier_owner'
      ? PERMISSION_OPTIONS.map(item => item.key)
      : ['create_shipment', 'view_shipment']
    this.setData({
      'addForm.role': role,
      'addForm.permissionKeys': permissionKeys,
      addPermissionOptions: decoratePermissionOptions(permissionKeys)
    })
  },

  onAddPermissionChange(e) {
    const permissionKeys = e.detail.value || []
    this.setData({
      'addForm.permissionKeys': permissionKeys,
      addPermissionOptions: decoratePermissionOptions(permissionKeys)
    })
  },

  async onSubmitAdd() {
    const { org, addForm } = this.data
    if (!addForm.name || !addForm.phone) {
      showToast('请填写姓名和手机号')
      return
    }

    this.setData({ saving: true })
    try {
      await callApi('organization.memberAdd', {
        orgId: org.id,
        name: addForm.name,
        phone: addForm.phone,
        role: addForm.role,
        permissions: addForm.permissionKeys
      })
      showToast('成员已添加', 'success')
      this.setData({ showAddDialog: false })
      await this.loadData()
    } catch (error) {
      showToast(error.message || '添加成员失败')
    } finally {
      this.setData({ saving: false })
    }
  },

  onEditPermissions(e) {
    if (!this.data.canManageMembers) {
      showToast('当前账号没有成员管理权限')
      return
    }

    const memberId = e.currentTarget.dataset.id
    const member = (this.data.members || []).find(item => item.id === memberId)
    if (!member) return

    this.setData({
      showPermissionDialog: true,
      editingMember: member,
      editingPermissions: member.permissionKeys || [],
      editPermissionOptions: decoratePermissionOptions(member.permissionKeys || [])
    })
  },

  onPermissionSwitch(e) {
    const { key } = e.currentTarget.dataset
    const checked = e.detail.value
    const permissions = new Set(this.data.editingPermissions || [])
    if (checked) {
      permissions.add(key)
    } else {
      permissions.delete(key)
    }
    const editingPermissions = Array.from(permissions)
    this.setData({
      editingPermissions,
      editPermissionOptions: decoratePermissionOptions(editingPermissions)
    })
  },

  onClosePermissionDialog() {
    this.setData({
      showPermissionDialog: false,
      editingMember: null,
      editingPermissions: [],
      editPermissionOptions: decoratePermissionOptions([])
    })
  },

  async onSavePermissions() {
    const member = this.data.editingMember
    if (!member) return

    this.setData({ saving: true })
    try {
      await callApi('organization.memberUpdatePermissions', {
        memberId: member.id,
        permissions: PERMISSION_OPTIONS.map(item => ({
          permission_key: item.key,
          granted: (this.data.editingPermissions || []).includes(item.key)
        }))
      })
      showToast('权限已更新', 'success')
      this.onClosePermissionDialog()
      await this.loadData()
    } catch (error) {
      showToast(error.message || '更新权限失败')
    } finally {
      this.setData({ saving: false })
    }
  },

  async onDeleteMember(e) {
    if (!this.data.canManageMembers) {
      showToast('当前账号没有成员管理权限')
      return
    }

    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除成员',
      content: `确认删除 ${name || '该成员'} 吗？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await callApi('organization.memberDelete', { memberId: id })
          showToast('成员已删除', 'success')
          this.loadData()
        } catch (error) {
          showToast(error.message || '删除成员失败')
        }
      }
    })
  }
})

function buildMemberRow(member) {
  const permissionKeys = (member.permissions || [])
    .filter(item => item.granted)
    .map(item => item.permission_key)

  const permissionLabels = PERMISSION_OPTIONS
    .filter(item => permissionKeys.includes(item.key))
    .map(item => item.label)

  return {
    id: member._id,
    name: member.name || '',
    phone: member.phone || '',
    role: member.role || 'supplier_member',
    roleLabel: member.role === 'supplier_owner' ? '负责人' : '成员',
    permissionKeys,
    permissionSummary: permissionLabels.slice(0, 3).join('、') || '暂无权限'
  }
}

function decoratePermissionOptions(selectedKeys) {
  const selectedSet = new Set(selectedKeys || [])
  return PERMISSION_OPTIONS.map(item => ({
    ...item,
    checked: selectedSet.has(item.key)
  }))
}
