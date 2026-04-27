import http from './http'

export function getProducts(params = {}) {
  return http.get('/products', { params })
}

export function searchProducts(q, params = {}) {
  return http.get('/products/search', { params: { ...params, q } })
}

export function getProductById(id) {
  return http.get(`/products/${id}`)
}

export function createProduct(payload) {
  return http.post('/products', payload)
}

export function updateProduct(id, payload) {
  return http.patch(`/products/${id}`, payload)
}

export function getMyProducts(params = {}) {
  return http.get('/products/mine', { params })
}
