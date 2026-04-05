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
        verifyAdmin(token, ['orders'])
        const { page = 0, pageSize = 20, status = '', disputeOnly = false } = reqData || {}

        const conditions = {}
        if (status) conditions.status = status
        if (disputeOnly) conditions.disputeStatus = 'open'

        let query = db.collection('orders')
        if (Object.keys(conditions).length > 0) query = query.where(conditions)

        const { total } = await query.count()
        const { data: orders } = await query
          .orderBy('createTime', 'desc')
          .skip(page * pageSize)
          .limit(pageSize)
          .get()

        // 批量获取商品标题
        for (const order of orders) {
          if (order.productId) {
            try {
              const { data: product } = await db.collection('products').doc(order.productId).get()
              order.productTitle = product.title
            } catch (e) {
              order.productTitle = '(已删除)'
            }
          }
        }

        return { code: 0, message: 'success', data: { list: orders, total, page, pageSize } }
      }

      case 'detail': {
        verifyAdmin(token, ['orders'])
        const { id } = reqData || {}
        if (!id) return { code: -1, message: '缺少订单ID', data: null }

        const { data: order } = await db.collection('orders').doc(id).get()

        // 获取买家信息
        let buyer = null
        if (order.buyerOpenid) {
          const { data: buyers } = await db.collection('users').where({ openid: order.buyerOpenid }).limit(1).get()
          if (buyers.length > 0) buyer = { nickName: buyers[0].nickName, avatarUrl: buyers[0].avatarUrl }
        }

        // 获取卖家信息
        let seller = null
        if (order.sellerOpenid) {
          const { data: sellers } = await db.collection('users').where({ openid: order.sellerOpenid }).limit(1).get()
          if (sellers.length > 0) seller = { nickName: sellers[0].nickName, avatarUrl: sellers[0].avatarUrl }
        }

        // 获取商品信息
        let product = null
        if (order.productId) {
          try {
            const { data: p } = await db.collection('products').doc(order.productId).get()
            product = { title: p.title, images: p.images, price: p.price }
          } catch (e) {
            product = null
          }
        }

        // 获取相关聊天记录
        const { data: messages } = await db.collection('messages')
          .where(_.or([
            { fromOpenid: order.buyerOpenid, toOpenid: order.sellerOpenid },
            { fromOpenid: order.sellerOpenid, toOpenid: order.buyerOpenid }
          ]))
          .orderBy('createTime', 'asc')
          .limit(50)
          .get()

        return { code: 0, message: 'success', data: { ...order, buyer, seller, product, messages } }
      }

      case 'intervene': {
        const admin = verifyAdmin(token, ['orders:write'])
        const { id, note } = reqData || {}
        if (!id) return { code: -1, message: '缺少订单ID', data: null }

        await db.collection('orders').doc(id).update({
          data: {
            disputeStatus: 'open',
            disputeNote: note || '',
            handlerUsername: admin.username,
            updateTime: db.serverDate()
          }
        })
        await logAction(db, admin.username, 'intervene_order', 'order', id, { note })
        return { code: 0, message: 'success', data: null }
      }

      case 'resolve': {
        const admin = verifyAdmin(token, ['orders:write'])
        const { id, resolution, note } = reqData || {}
        if (!id || !resolution) return { code: -1, message: '缺少参数', data: null }

        const updateData = {
          disputeStatus: 'resolved',
          disputeNote: note || '',
          handlerUsername: admin.username,
          updateTime: db.serverDate()
        }

        // 根据裁决更新订单状态
        if (resolution === 'force_refund') {
          updateData.status = 'cancelled'
        } else if (resolution === 'force_complete') {
          updateData.status = 'completed'
        }

        await db.collection('orders').doc(id).update({ data: updateData })
        await logAction(db, admin.username, 'resolve_dispute', 'order', id, { resolution, note })
        return { code: 0, message: 'success', data: null }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
