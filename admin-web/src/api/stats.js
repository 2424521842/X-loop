import { callAdminApi } from './request'

export function getOverview() {
  return callAdminApi('admin-stats', { action: 'overview' })
}

export function getTrend(type, days) {
  return callAdminApi('admin-stats', { action: 'trend', data: { type, days } })
}

export function getDistribution() {
  return callAdminApi('admin-stats', { action: 'distribution' })
}
