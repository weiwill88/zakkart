import { callApi } from './api'
import { useAuthStore } from '../stores/auth'

function getToken() {
  const auth = useAuthStore()
  return auth.token
}

export async function fetchOrgList(params = {}) {
  return callApi('organization.list', params, { token: getToken() })
}

export async function fetchOrgDetail(id) {
  return callApi('organization.detail', { id }, { token: getToken() })
}

export async function createOrg(data) {
  return callApi('organization.create', data, { token: getToken() })
}

export async function updateOrg(id, data) {
  return callApi('organization.update', { id, ...data }, { token: getToken() })
}

export async function fetchMembers(orgId) {
  return callApi('organization.memberList', { orgId }, { token: getToken() })
}

export async function addMember(data) {
  return callApi('organization.memberAdd', data, { token: getToken() })
}

export async function updateMemberPermissions(memberId, permissions) {
  return callApi('organization.memberUpdatePermissions', { memberId, permissions }, { token: getToken() })
}

export async function deleteMember(memberId) {
  return callApi('organization.memberDelete', { memberId }, { token: getToken() })
}

export async function fetchPartPrices(orgId) {
  return callApi('organization.partPrices', { orgId }, { token: getToken() })
}

export async function updatePartPrice(partTypeId, data) {
  return callApi('organization.updatePartPrice', { partTypeId, ...data }, { token: getToken() })
}
