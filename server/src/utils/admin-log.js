/**
 * 管理端审计日志工具
 */
const AdminLog = require('../models/AdminLog')

async function logAction(req, action, targetType, targetId, detail = {}) {
  try {
    await AdminLog.create({
      adminUsername: req.admin ? req.admin.username : '',
      action,
      targetType,
      targetId: targetId ? String(targetId) : '',
      detail,
      ip: req.ip || ''
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
  }
}

module.exports = { logAction }
