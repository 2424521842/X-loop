const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { targetOpenid, page = 0, pageSize = 20 } = event

  if (!targetOpenid) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    const { data: reviews } = await db.collection('reviews')
      .where({ toOpenid: targetOpenid })
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    // 获取评价者信息
    const fromOpenids = [...new Set(reviews.map(r => r.fromOpenid))]
    let userMap = {}
    if (fromOpenids.length > 0) {
      const { data: users } = await db.collection('users')
        .where({ openid: _.in(fromOpenids) })
        .field({ openid: true, nickName: true, avatarUrl: true })
        .get()
      users.forEach(u => { userMap[u.openid] = u })
    }

    const result = reviews.map(r => ({
      ...r,
      fromUser: userMap[r.fromOpenid] || { nickName: '匿名用户', avatarUrl: '' }
    }))

    return { code: 0, message: 'success', data: result }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
