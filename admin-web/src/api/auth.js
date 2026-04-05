import { callAdminApi } from './request'

export function login(username, password) {
  return callAdminApi('admin-login', { username, password })
}
