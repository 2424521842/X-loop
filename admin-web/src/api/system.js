import request from './request'

export function getAdminList() {
  return request.get('/admins')
}

export function createAdmin(data) {
  return request.post('/admins', data)
}

export function updateAdmin(id, data) {
  return request.patch(`/admins/${id}`, data)
}

export function deleteAdmin(id) {
  return request.delete(`/admins/${id}`)
}

export function getAdminLogs(params) {
  return request.get('/logs', { params })
}

export function getCategories() {
  return request.get('/categories')
}

export function createCategory(data) {
  return request.post('/categories', data)
}

export function updateCategory(id, data) {
  return request.patch(`/categories/${id}`, data)
}

export function deleteCategory(id) {
  return request.delete(`/categories/${id}`)
}

export function getCategoryDistribution() {
  return request.get('/stats/distribution')
}
