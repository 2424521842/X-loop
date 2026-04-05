export const ROLE_MENUS = {
  super_admin: ['dashboard', 'users', 'products', 'reports', 'orders', 'system'],
  content_moderator: ['dashboard', 'users', 'products', 'reports'],
  customer_service: ['dashboard', 'users', 'products', 'orders'],
  data_analyst: ['dashboard']
}

export const ROLE_LABELS = {
  super_admin: '超级管理员',
  content_moderator: '内容审核员',
  customer_service: '客服',
  data_analyst: '数据分析师'
}

export function hasMenu(role, menu) {
  return (ROLE_MENUS[role] || []).includes(menu)
}
