import { callAdminApi } from './request'

export function getOrderList(params) {
  return callAdminApi('admin-orders', { action: 'list', data: params })
}

export function getOrderDetail(id) {
  return callAdminApi('admin-orders', { action: 'detail', data: { id } })
}

export function interveneOrder(id, note) {
  return callAdminApi('admin-orders', { action: 'intervene', data: { id, note } })
}

export function resolveOrder(id, resolution, note) {
  return callAdminApi('admin-orders', { action: 'resolve', data: { id, resolution, note } })
}
