import request from './request'

export function getProductList(params) {
  return request.get('/products', { params })
}

export function getProductDetail(id) {
  return request.get(`/products/${id}`)
}

export function removeProduct(id, reason) {
  return request.post(`/products/${id}/remove`, { reason })
}

export function restoreProduct(id) {
  return request.post(`/products/${id}/restore`, {})
}

export function batchRemoveProducts(ids, reason) {
  return request.post('/products/batch-remove', { ids, reason })
}
