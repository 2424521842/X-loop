/**
 * 用户数据脱敏工具
 * sanitizeUserSelf：返回给本人（含 email）
 * sanitizeUserPublic：返回给他人（仅公开字段）
 */

/**
 * 将 Mongoose 文档或普通对象转为安全的可序列化对象
 * @param {object} user
 */
function toPlain(user) {
  if (user && typeof user.toObject === 'function') {
    return user.toObject()
  }
  return user
}

/**
 * 返回给本人的完整字段（含 email）
 */
function sanitizeUserSelf(user) {
  const u = toPlain(user)
  if (!u) return null
  return {
    id: String(u._id),
    email: u.email || '',
    nickName: u.nickName || '',
    avatarUrl: u.avatarUrl || '',
    campus: u.campus || '',
    credit: u.credit !== undefined ? u.credit : 100,
    status: u.status || 'active',
    emailVerified: !!u.emailVerified,
    emailVerifiedAt: u.emailVerifiedAt || null,
    createdAt: u.createdAt || null,
    updatedAt: u.updatedAt || null
  }
}

/**
 * 返回给他人的公开字段（不含 email）
 */
function sanitizeUserPublic(user) {
  const u = toPlain(user)
  if (!u) return null
  return {
    id: String(u._id),
    nickName: u.nickName || '',
    avatarUrl: u.avatarUrl || '',
    credit: u.credit !== undefined ? u.credit : 100,
    campus: u.campus || ''
  }
}

module.exports = { sanitizeUserSelf, sanitizeUserPublic }
