const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orderId, action } = event

  if (!orderId || !action) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    const { data: order } = await db.collection('orders').doc(orderId).get()
    if (!order) {
      return { code: -1, message: '订单不存在', data: null }
    }

    // 验证权限和状态流转
    const validTransitions = {
      confirm: { from: 'pending', to: 'confirmed', role: 'seller' },
      complete: { from: 'confirmed', to: 'completed', role: 'buyer' },
      cancel: { from: ['pending', 'confirmed'], to: 'cancelled', role: 'both' }
    }

    const transition = validTransitions[action]
    if (!transition) {
      return { code: -1, message: '无效的操作', data: null }
    }

    // 验证当前状态
    const validFrom = Array.isArray(transition.from) ? transition.from : [transition.from]
    if (!validFrom.includes(order.status)) {
      return { code: -1, message: '当前状态不允许此操作', data: null }
    }

    // 验证角色
    if (transition.role === 'seller' && order.sellerOpenid !== openid) {
      return { code: -1, message: '只有卖家可以执行此操作', data: null }
    }
    if (transition.role === 'buyer' && order.buyerOpenid !== openid) {
      return { code: -1, message: '只有买家可以执行此操作', data: null }
    }
    if (transition.role === 'both' && order.buyerOpenid !== openid && order.sellerOpenid !== openid) {
      return { code: -1, message: '无权操作此订单', data: null }
    }

    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: {
        status: transition.to,
        updateTime: db.serverDate()
      }
    })

    // 如果取消订单，将商品恢复为在售
    if (action === 'cancel') {
      await db.collection('products').doc(order.productId).update({
        data: {
          status: 'on_sale',
          updateTime: db.serverDate()
        }
      })
    }

    // 如果完成订单，将商品标记为已售
    if (action === 'complete') {
      await db.collection('products').doc(order.productId).update({
        data: {
          status: 'sold',
          updateTime: db.serverDate()
        }
      })
    }

    return { code: 0, message: 'success', data: null }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
