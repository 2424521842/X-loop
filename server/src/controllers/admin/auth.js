/**
 * 管理端登录控制器
 */
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Admin = require('../../models/Admin')
const { success, fail } = require('../../utils/response')

function serializeAdmin(admin) {
  const legacyName = typeof admin.get === 'function' ? admin.get('displayName') : admin.displayName
  const legacyLastLogin = typeof admin.get === 'function' ? admin.get('lastLoginTime') : admin.lastLoginTime
  return {
    id: String(admin._id),
    username: admin.username,
    role: admin.role,
    name: admin.name || '',
    displayName: admin.name || legacyName || admin.username,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt || legacyLastLogin || null,
    createdAt: admin.createdAt || null,
    updatedAt: admin.updatedAt || null
  }
}

async function login(req, res, next) {
  try {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')

    if (!username || !password) {
      return res.status(400).json(fail('请输入用户名和密码'))
    }

    const admin = await Admin.findOne({ username })
    if (!admin) {
      return res.status(401).json(fail('用户名或密码错误'))
    }
    if (admin.status !== 'active') {
      return res.status(403).json(fail('账号已被禁用'))
    }

    const passwordHash = admin.password || (typeof admin.get === 'function' ? admin.get('passwordHash') : admin.passwordHash)
    const isMatch = passwordHash ? await bcrypt.compare(password, passwordHash) : false
    if (!isMatch) {
      return res.status(401).json(fail('用户名或密码错误'))
    }

    const token = jwt.sign(
      { adminId: String(admin._id), username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    if (!admin.password && passwordHash) {
      admin.password = passwordHash
    }
    admin.lastLoginAt = new Date()
    await admin.save()

    return res.json(success({
      token,
      role: admin.role,
      displayName: admin.name || (typeof admin.get === 'function' ? admin.get('displayName') : '') || admin.username,
      username: admin.username
    }))
  } catch (err) {
    next(err)
  }
}

module.exports = { login, serializeAdmin }
