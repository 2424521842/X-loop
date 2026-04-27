import request from './request'

export function getOrderList(params) {
  return request.get('/orders', { params })
}

export function getOrderDetail(id) {
  return request.get(`/orders/${id}`)
}

export function interveneOrder(id, note) {
  return request.post(`/orders/${id}/intervene`, { note })
}

export function resolveOrder(id, resolution, note) {
  return request.post(`/orders/${id}/resolve`, { resolution, note })
}
