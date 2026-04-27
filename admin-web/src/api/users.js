import request from './request'

export function getUserList(params) {
  return request.get('/users', { params })
}

export function getUserDetail(id) {
  return request.get(`/users/${id}`)
}

export function banUser(id, reason) {
  return request.post(`/users/${id}/ban`, { reason })
}

export function unbanUser(id) {
  return request.post(`/users/${id}/unban`, {})
}

export function adjustCredit(id, credit, reason) {
  return request.post(`/users/${id}/credit`, { credit, reason })
}
