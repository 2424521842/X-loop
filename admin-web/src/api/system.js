import { callAdminApi } from './request'

export function getAdminList() {
  return callAdminApi('admin-users', { action: 'admin-list' })
}

export function createAdmin(data) {
  return callAdminApi('admin-login', { action: 'create-admin', ...data })
}

export function getAdminLogs(params) {
  return callAdminApi('admin-stats', { action: 'logs', data: params })
}

export function getCategoryDistribution() {
  return callAdminApi('admin-stats', { action: 'distribution' })
}
