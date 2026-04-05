const cloud = require('wx-server-sdk')
const { verifyAdmin } = require('../admin-common/auth')
const { logAction } = require('../admin-common/logger')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event || {}

    switch (action) {
      case 'list': {
        verifyAdmin(token, ['users'])
        const { page = 0, pageSize = 20, keyword = '', status = '' } = reqData || {}
        let query = db.collection('users')
        const conditions = {}

        if (status) conditions.status = status
        if (keyword) {
          conditions.nickName = db.RegExp({ regexp: keyword, options: 'i' })
        }
        if (Object.keys(conditions).length > 0) {
          query = query.where(conditions)
        }

        const { total } = await query.count()
        const { data: users } = await query
          .orderBy('createTime', 'desc')
          .skip(page * pageSize)
          .limit(pageSize)
          .get()

        return { code: 0, message: 'success', data: { list: users, total, page, pageSize } }
      }

      case 'detail': {
        verifyAdmin(token, ['users'])
        const { openid } = reqData || {}
        if (!openid) return { code: -1, message: '缺少 openid', data: null }

        const { data: users } = await db.collection('users').where({ openid }).limit(1).get()
        if (users.length === 0) return { code: -1, message: '用户不存在', data: null }

        // 获取用户的商品、订单数量
        const { total: productCount } = await db.collection('products').where({ sellerOpenid: openid }).count()
        const { total: orderCount } = await db.collection('orders').where(_.or([
          { buyerOpenid: openid },
          { sellerOpenid: openid }
        ])).count()
        const { total: reportCount } = await db.collection('reports').where({ targetId: openid, targetType: 'user' }).count()

        return {
          code: 0,
          message: 'success',
          data: { ...users[0], productCount, orderCount, reportCount }
        }
      }

      case 'ban': {
        const admin = verifyAdmin(token, ['users:write'])
        const { openid, reason } = reqData || {}
        if (!openid || !reason) return { code: -1, message: '缺少参数', data: null }

        await db.collection('users').where({ openid }).update({
          data: { status: 'banned', banReason: reason, banTime: db.serverDate(), updateTime: db.serverDate() }
        })
        await logAction(db, admin.username, 'ban_user', 'user', openid, { reason })
        return { code: 0, message: 'success', data: null }
      }

      case 'unban': {
        const admin = verifyAdmin(token, ['users:write'])
        const { openid } = reqData || {}
        if (!openid) return { code: -1, message: '缺少 openid', data: null }

        await db.collection('users').where({ openid }).update({
          data: { status: 'active', banReason: _.remove(), banTime: _.remove(), updateTime: db.serverDate() }
        })
        await logAction(db, admin.username, 'unban_user', 'user', openid, {})
        return { code: 0, message: 'success', data: null }
      }

      case 'adjust-credit': {
        const admin = verifyAdmin(token, ['users:write'])
        const { openid, credit, reason } = reqData || {}
        if (!openid || credit === undefined || !reason) return { code: -1, message: '缺少参数', data: null }

        // 获取旧信誉分
        const { data: users } = await db.collection('users').where({ openid }).limit(1).get()
        const oldCredit = users.length > 0 ? (users[0].credit || 100) : 100

        await db.collection('users').where({ openid }).update({
          data: { credit: Number(credit), updateTime: db.serverDate() }
        })
        await logAction(db, admin.username, 'adjust_credit', 'user', openid, {
          oldCredit,
          newCredit: Number(credit),
          reason
        })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
