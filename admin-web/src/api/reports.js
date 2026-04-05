import { callAdminApi } from './request'

export function getReportList(params) {
  return callAdminApi('admin-reports', { action: 'list', data: params })
}

export function getReportDetail(id) {
  return callAdminApi('admin-reports', { action: 'detail', data: { id } })
}

export function claimReport(id) {
  return callAdminApi('admin-reports', { action: 'claim', data: { id } })
}

export function resolveReport(id, result, handleAction) {
  return callAdminApi('admin-reports', { action: 'resolve', data: { id, result, handleAction } })
}
