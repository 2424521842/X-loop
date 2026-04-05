/**
 * 审计日志写入
 * @param {object} db - 云数据库实例
 * @param {string} username - 操作人
 * @param {string} action - 操作类型
 * @param {string} targetType - 目标类型 (user/product/order/report)
 * @param {string} targetId - 目标ID
 * @param {object} detail - 操作详情
 */
async function logAction(db, username, action, targetType, targetId, detail = {}) {
  try {
    await db.collection('admin_logs').add({
      data: {
        username,
        action,
        targetType,
        targetId,
        detail,
        createTime: db.serverDate()
      }
    })
  } catch (err) {
    console.error('写入审计日志失败:', err)
    // 日志写入失败不影响主流程
  }
}

module.exports = { logAction }
