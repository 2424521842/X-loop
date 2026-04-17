const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orderId, rating, content = '' } = event

  if (!orderId || !rating || rating < 1 || rating > 5) {
    return { code: -1, message: '参数不完整或评分无效', data: null }
  }

  try {
    // 验证订单存在且已完成
    const { data: order } = await db.collection('orders').doc(orderId).get()
    if (!order) {
      return { code: -1, message: '订单不存在', data: null }
    }
    if (order.status !== 'completed') {
      return { code: -1, message: '只能对已完成的订单评价', data: null }
    }
    if (order.buyerOpenid !== openid && order.sellerOpenid !== openid) {
      return { code: -1, message: '无权评价此订单', data: null }
    }

    // 检查是否已评价
    const { total } = await db.collection('reviews')
      .where({ orderId, fromOpenid: openid })
      .count()
    if (total > 0) {
      return { code: -1, message: '您已评价过此订单', data: null }
    }

    // 提交前进行文本内容安全检测
    if (content.length > 0) {
      let secCheckResult
      try {
        secCheckResult = await cloud.openapi.security.msgSecCheck({
          version: 2,
          scene: 2,
          openid,
          content
        })
      } catch (err) {
        return { code: -1, message: '内容安全检测失败，请稍后重试', data: null }
      }

      const suggest = secCheckResult && secCheckResult.result ? secCheckResult.result.suggest : ''
      if (suggest === 'risky' || suggest === 'review') {
        return { code: -1, message: '内容包含违规信息，请修改后重试', data: null }
      }
    }

    const toOpenid = openid === order.buyerOpenid ? order.sellerOpenid : order.buyerOpenid

    // 创建评价
    const result = await db.collection('reviews').add({
      data: {
        orderId,
        fromOpenid: openid,
        toOpenid,
        rating: Number(rating),
        content,
        createTime: db.serverDate()
      }
    })

    // 更新对方信誉分（好评+2，中评0，差评-3）
    let creditDelta = 0
    if (rating >= 4) creditDelta = 2
    else if (rating <= 2) creditDelta = -3

    if (creditDelta !== 0) {
      await db.collection('users')
        .where({ openid: toOpenid })
        .update({ data: { credit: _.inc(creditDelta) } })
    }

    return { code: 0, message: 'success', data: { id: result._id } }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
