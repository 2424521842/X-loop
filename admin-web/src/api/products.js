import { callAdminApi } from './request'

export function getProductList(params) {
  return callAdminApi('admin-products', { action: 'list', data: params })
}

export function getProductDetail(id) {
  return callAdminApi('admin-products', { action: 'detail', data: { id } })
}

export function removeProduct(id, reason) {
  return callAdminApi('admin-products', { action: 'remove', data: { id, reason } })
}

export function restoreProduct(id) {
  return callAdminApi('admin-products', { action: 'restore', data: { id } })
}

export function batchRemoveProducts(ids, reason) {
  return callAdminApi('admin-products', { action: 'batch-remove', data: { ids, reason } })
}
