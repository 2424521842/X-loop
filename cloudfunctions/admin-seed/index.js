/**
 * 管理员种子数据脚本（一次性使用）
 *
 * 用法：在微信开发者工具中部署此云函数，然后调用一次。
 * 完成后请删除此云函数，避免安全风险。
 *
 * 调用方式：在云开发控制台 → 云函数 → admin-seed → 测试，参数留空 {}
 */
const cloud = require('wx-server-sdk')
const bcrypt = require('bcryptjs')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const results = []

  // 1. 检查 admins 集合是否已有数据
  try {
    const { total } = await db.collection('admins').count()
    if (total > 0) {
      return { code: -1, message: `admins 集合已有 ${total} 条记录，跳过种子操作`, data: null }
    }
  } catch (err) {
    // 集合不存在时 count 会报错，需要先在控制台创建集合
    return {
      code: -1,
      message: '请先在云开发控制台创建以下集合：admins, reports, admin_logs',
      data: null
    }
  }

  // 2. 创建超级管理员账号
  // ⚠️ 部署前请修改密码！
  const password = 'XLoop@Admin2026'
  const passwordHash = bcrypt.hashSync(password, 10)

  const { _id } = await db.collection('admins').add({
    data: {
      username: 'admin',
      passwordHash,
      role: 'super_admin',
      displayName: '超级管理员',
      status: 'active',
      createTime: db.serverDate()
    }
  })
  results.push(`超级管理员已创建 (_id: ${_id})`)

  // 3. 验证集合可写
  try {
    const { _id: logId } = await db.collection('admin_logs').add({
      data: {
        username: 'admin',
        action: 'seed_database',
        targetType: 'system',
        targetId: 'init',
        detail: { message: '初始化管理系统' },
        createTime: db.serverDate()
      }
    })
    results.push(`admin_logs 集合可写 (_id: ${logId})`)
  } catch (err) {
    results.push('⚠️ admin_logs 集合不存在，请在控制台创建')
  }

  try {
    const { total } = await db.collection('reports').count()
    results.push(`reports 集合可读 (${total} 条记录)`)
  } catch (err) {
    results.push('⚠️ reports 集合不存在，请在控制台创建')
  }

  return {
    code: 0,
    message: 'success',
    data: {
      results,
      loginInfo: {
        username: 'admin',
        password,
        note: '⚠️ 请登录后立即修改密码！'
      }
    }
  }
}
