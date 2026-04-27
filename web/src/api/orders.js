import http from './http'

export function createOrder(payload) {
  return http.post('/orders', payload)
}

export function getOrders(params = {}) {
  return http.get('/orders', { params })
}

export function updateOrder(id, payload) {
  return http.patch(`/orders/${id}`, payload)
}
