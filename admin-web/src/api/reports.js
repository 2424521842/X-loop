import request from './request'

export function getReportList(params) {
  return request.get('/reports', { params })
}

export function getReportDetail(id) {
  return request.get(`/reports/${id}`)
}

export function claimReport(id) {
  return request.post(`/reports/${id}/claim`, {})
}

export function resolveReport(id, result, handleAction) {
  return request.post(`/reports/${id}/resolve`, { result, handleAction })
}
