const jwt = require('jsonwebtoken')

// JWT 密钥 - 部署时通过云函数环境变量覆盖
const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

// 角色权限映射
const ROLE_PERMISSIONS = {
  super_admin: ['dashboard', 'users', 'users:write', 'products', 'products:write', 'orders', 'orders:write', 'reports', 'reports:write', 'system'],
  content_moderator: ['dashboard', 'users', 'users:write', 'products', 'products:write', 'reports', 'reports:write'],
  customer_service: ['dashboard', 'users', 'orders', 'orders:write', 'products'],
  data_analyst: ['dashboard', 'users', 'products', 'orders', 'stats']
}

/**
 * 签发 JWT token
 * @param {object} payload - { username, role }
 * @returns {string} token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * 验证 JWT token 并检查角色权限
 * @param {string} token - JWT token
 * @param {string[]} requiredPermissions - 需要的权限列表
 * @returns {object} { username, role }
 * @throws {Error} 鉴权失败时抛出错误
 */
function verifyAdmin(token, requiredPermissions = []) {
  if (!token) {
    throw new Error('未提供认证令牌')
  }

  // 去掉 Bearer 前缀
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token

  let decoded
  try {
    decoded = jwt.verify(actualToken, JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('令牌已过期，请重新登录')
    }
    throw new Error('无效的认证令牌')
  }

  const { username, role } = decoded
  if (!username || !role) {
    throw new Error('无效的令牌内容')
  }

  // 检查权限
  const userPermissions = ROLE_PERMISSIONS[role] || []
  for (const perm of requiredPermissions) {
    if (!userPermissions.includes(perm)) {
      throw new Error('权限不足')
    }
  }

  return { username, role }
}

module.exports = { signToken, verifyAdmin, ROLE_PERMISSIONS }
