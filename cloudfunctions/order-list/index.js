const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { role = 'buyer', status, page = 0, pageSize = 20, onlyCount = false } = event

  try {
    const baseWhere = {}
    if (role === 'buyer') {
      baseWhere.buyerOpenid = openid
    } else {
      baseWhere.sellerOpenid = openid
    }
    const query = status ? { ...baseWhere, status } : baseWhere

    if (onlyCount) {
      const statusList = ['pending', 'confirmed', 'completed', 'cancelled']
      const [{ total }, statusCounts] = await Promise.all([
        db.collection('orders').where(baseWhere).count(),
        Promise.all(statusList.map(itemStatus =>
          db.collection('orders').where({ ...baseWhere, status: itemStatus }).count()
            .then(res => ({ status: itemStatus, count: res.total }))
        ))
      ])

      const counts = statusCounts.reduce((map, item) => {
        map[item.status] = item.count
        return map
      }, {})
      counts.effective = (counts.pending || 0) + (counts.confirmed || 0) + (counts.completed || 0)

      return { code: 0, message: 'success', data: { total, counts } }
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

    // 脱敏返回数据，仅保留前端需要的字段
    const result = orders.map(o => {
      const otherOpenid = role === 'buyer' ? o.sellerOpenid : o.buyerOpenid
      return {
        _id: o._id,
        productId: o.productId,
        productTitle: o.productTitle,
        productImage: o.productImage,
        price: o.price,
        status: o.status,
        createTime: o.createTime,
        otherOpenid,
        otherUser: userMap[otherOpenid] || { nickName: '未知用户', avatarUrl: '' }
      }
    })

    return { code: 0, message: 'success', data: result }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
