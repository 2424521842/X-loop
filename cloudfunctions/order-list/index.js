const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { role = 'buyer', status, page = 0, pageSize = 20 } = event

  try {
    let query = {}
    if (role === 'buyer') {
      query.buyerOpenid = openid
    } else {
      query.sellerOpenid = openid
    }
    if (status) {
      query.status = status
    }

    const { data: orders } = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    // 批量获取对方用户信息
    const otherOpenids = [...new Set(orders.map(o =>
      role === 'buyer' ? o.sellerOpenid : o.buyerOpenid
    ))]

    let userMap = {}
    if (otherOpenids.length > 0) {
      const { data: users } = await db.collection('users')
        .where({ openid: _.in(otherOpenids) })
        .field({ openid: true, nickName: true, avatarUrl: true })
        .get()
      users.forEach(u => { userMap[u.openid] = u })
    }

    const result = orders.map(o => ({
      ...o,
      otherUser: userMap[role === 'buyer' ? o.sellerOpenid : o.buyerOpenid] || { nickName: '未知用户', avatarUrl: '' }
    }))

    return { code: 0, message: 'success', data: result }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
