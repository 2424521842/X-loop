import http from './http'

export function updateMe(payload) {
  return http.patch('/users/me', payload)
}

export function getUserById(id) {
  return http.get(`/users/${id}`)
}
