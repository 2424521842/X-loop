/**
 * JWT 鉴权中间件
 * 解析 Authorization: Bearer <token>，验签后挂 req.user = { id }
 */
const jwt = require('jsonwebtoken')
const { fail } = require('../utils/response')

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json(fail('请先登录'))
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    // 挂载用户 id 到请求对象
    req.user = { id: payload.userId }
    next()
  } catch (err) {
    return res.status(401).json(fail('请先登录'))
  }
}

module.exports = authMiddleware
