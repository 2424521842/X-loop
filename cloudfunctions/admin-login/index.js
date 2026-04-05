const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

exports.main = async (event) => {
  try {
    const { username, password } = event

    // 参数校验
    if (!username || !password) {
      return { code: -1, message: '请输入用户名和密码', data: null }
    }

    // 查找管理员
    const { data: admins } = await db.collection('admins')
      .where({ username })
      .limit(1)
      .get()

    if (admins.length === 0) {
      return { code: -1, message: '用户名或密码错误', data: null }
    }

    const admin = admins[0]

    // 检查账号状态
    if (admin.status !== 'active') {
      return { code: -1, message: '账号已被禁用', data: null }
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, admin.passwordHash)
    if (!isMatch) {
      return { code: -1, message: '用户名或密码错误', data: null }
    }

    // 签发 JWT
    const token = jwt.sign(
      { username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // 更新最后登录时间
    await db.collection('admins').doc(admin._id).update({
      data: { lastLoginTime: db.serverDate() }
    })

    return {
      code: 0,
      message: 'success',
      data: {
        token,
        role: admin.role,
        displayName: admin.displayName,
        username: admin.username
      }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
