import { callAdminApi } from './request'

export function getUserList(params) {
  return callAdminApi('admin-users', { action: 'list', data: params })
}

export function getUserDetail(openid) {
  return callAdminApi('admin-users', { action: 'detail', data: { openid } })
}

export function banUser(openid, reason) {
  return callAdminApi('admin-users', { action: 'ban', data: { openid, reason } })
}

export function unbanUser(openid) {
  return callAdminApi('admin-users', { action: 'unban', data: { openid } })
}

export function adjustCredit(openid, credit, reason) {
  return callAdminApi('admin-users', { action: 'adjust-credit', data: { openid, credit, reason } })
}
