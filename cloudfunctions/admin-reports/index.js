const cloud = require('wx-server-sdk')
const { verifyAdmin } = require('admin-common/auth')
const { logAction } = require('admin-common/logger')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event || {}

    switch (action) {
      case 'list': {
        verifyAdmin(token, ['reports'])
        const { page = 0, pageSize = 20, status = '' } = reqData || {}

        let query = db.collection('reports')
        if (status) query = query.where({ status })

        const { total } = await query.count()
        const { data: reports } = await query
          .orderBy('createTime', 'desc')
          .skip(page * pageSize)
          .limit(pageSize)
          .get()

        return { code: 0, message: 'success', data: { list: reports, total, page, pageSize } }
      }

      case 'detail': {
        verifyAdmin(token, ['reports'])
        const { id } = reqData || {}
        if (!id) return { code: -1, message: '缺少举报ID', data: null }

        const { data: report } = await db.collection('reports').doc(id).get()

        // 获取被举报对象信息
        let target = null
        if (report.targetType === 'product') {
          try {
            const { data: p } = await db.collection('products').doc(report.targetId).get()
            target = { title: p.title, images: p.images, status: p.status, sellerOpenid: p.sellerOpenid }
          } catch (e) {
            target = null
          }
        } else if (report.targetType === 'user') {
          const { data: users } = await db.collection('users').where({ openid: report.targetId }).limit(1).get()
          if (users.length > 0) target = { nickName: users[0].nickName, status: users[0].status }
        }

        // 获取举报人信息
        let reporter = null
        if (report.reporterOpenid) {
          const { data: users } = await db.collection('users').where({ openid: report.reporterOpenid }).limit(1).get()
          if (users.length > 0) reporter = { nickName: users[0].nickName }
        }

        // 聚合同一对象的其他举报
        const { data: relatedReports } = await db.collection('reports')
          .where({ targetId: report.targetId, targetType: report.targetType, _id: _.neq(id) })
          .orderBy('createTime', 'desc')
          .limit(10)
          .get()

        return { code: 0, message: 'success', data: { ...report, target, reporter, relatedReports } }
      }

      case 'claim': {
        const admin = verifyAdmin(token, ['reports:write'])
        const { id } = reqData || {}
        if (!id) return { code: -1, message: '缺少举报ID', data: null }

        const { data: report } = await db.collection('reports').doc(id).get()
        if (report.status !== 'pending') {
          return { code: -1, message: '该举报当前状态不可认领', data: null }
        }

        await db.collection('reports').doc(id).update({
          data: { status: 'processing', handlerUsername: admin.username }
        })
        await logAction(db, admin.username, 'claim_report', 'report', id, {})
        return { code: 0, message: 'success', data: null }
      }

      case 'resolve': {
        const admin = verifyAdmin(token, ['reports:write'])
        const { id, result, handleAction } = reqData || {}
        if (!id || !result) return { code: -1, message: '缺少参数', data: null }

        // 更新举报状态
        const reportUpdate = {
          status: handleAction === 'reject' ? 'rejected' : 'resolved',
          handleResult: result,
          handlerUsername: admin.username,
          handleTime: db.serverDate()
        }
        await db.collection('reports').doc(id).update({ data: reportUpdate })

        // 如果需要，执行关联操作（下架商品/封禁用户）
        const { data: report } = await db.collection('reports').doc(id).get()
        if (handleAction === 'remove_product' && report.targetType === 'product') {
          await db.collection('products').doc(report.targetId).update({
            data: { status: 'off_shelf', adminNote: '因举报下架: ' + result, updateTime: db.serverDate() }
          })
          await logAction(db, admin.username, 'remove_product', 'product', report.targetId, { reason: result, fromReport: id })
        } else if (handleAction === 'ban_user' && report.targetType === 'user') {
          await db.collection('users').where({ openid: report.targetId }).update({
            data: {
              status: 'banned',
              banReason: '因举报封禁: ' + result,
              banTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          await logAction(db, admin.username, 'ban_user', 'user', report.targetId, { reason: result, fromReport: id })
        }

        await logAction(db, admin.username, 'resolve_report', 'report', id, { result, handleAction })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
