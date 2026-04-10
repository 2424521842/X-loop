const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { status, mine = false, page = 0, pageSize = 20 } = event

  try {
    let query = {}
    if (status) query.status = status
    if (mine) query.creatorOpenid = openid

    const { data: groups } = await db.collection('group_buys')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    // 获取发起人信息
    const creatorOpenids = [...new Set(groups.map(g => g.creatorOpenid))]
    let userMap = {}
    if (creatorOpenids.length > 0) {
      const { data: users } = await db.collection('users')
        .where({ openid: _.in(creatorOpenids) })
        .field({ openid: true, nickName: true, avatarUrl: true })
        .get()
      users.forEach(u => { userMap[u.openid] = u })
    }

    // 脱敏返回数据，不暴露 participants openid 数组
    const result = groups.map(g => ({
      _id: g._id,
      title: g.title,
      description: g.description,
      images: g.images,
      unitPrice: g.unitPrice,
      targetCount: g.targetCount,
      currentCount: g.currentCount,
      status: g.status,
      deadline: g.deadline,
      createTime: g.createTime,
      creator: userMap[g.creatorOpenid] || { nickName: '未知用户', avatarUrl: '' },
      joined: g.participants.includes(openid),
      progress: Math.round((g.currentCount / g.targetCount) * 100)
    }))

    return { code: 0, message: 'success', data: result }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
