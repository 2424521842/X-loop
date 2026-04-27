/**
 * 管理端 JWT 鉴权与 RBAC 权限检查
 */
const jwt = require('jsonwebtoken')
const { fail } = require('../utils/response')

const ROLE_PERMISSIONS = {
  super_admin: ['dashboard', 'users', 'users:write', 'products', 'products:write', 'orders', 'orders:write', 'reports', 'reports:write', 'system', 'stats'],
  content_moderator: ['dashboard', 'users', 'users:write', 'products', 'products:write', 'reports', 'reports:write'],
  customer_service: ['dashboard', 'users', 'orders', 'orders:write', 'products'],
  data_analyst: ['dashboard', 'users', 'products', 'orders', 'stats']
}

function readToken(req) {
  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7)
  return null
}

function requireAdmin(req, res, next) {
  const token = readToken(req)
  if (!token) {
    return res.status(401).json(fail('未提供认证令牌'))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!decoded.username || !decoded.role) {
      return res.status(401).json(fail('无效的令牌内容'))
    }
    req.admin = {
      username: decoded.username,
      role: decoded.role
    }
    next()
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? '令牌已过期，请重新登录' : '无效的认证令牌'
    return res.status(401).json(fail(message))
  }
}

function requirePerm(perm) {
  return (req, res, next) => {
    const role = req.admin && req.admin.role
    const perms = ROLE_PERMISSIONS[role] || []
    if (!perms.includes(perm)) {
      return res.status(403).json(fail('权限不足'))
    }
    next()
  }
}

module.exports = { requireAdmin, requirePerm, ROLE_PERMISSIONS }
