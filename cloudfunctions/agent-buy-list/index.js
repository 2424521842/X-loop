const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { mine = false, status, page = 0, pageSize = 20 } = event

  try {
    let query = {}
    if (mine) {
      query = _.or([
        { requesterOpenid: openid },
        { agentOpenid: openid }
      ])
    }
    if (status) {
      if (mine) {
        // 需要组合查询
        query = _.and([
          query,
          { status }
        ])
      } else {
        query.status = status
      }
    }

    const { data: agentBuys } = await db.collection('agent_buys')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    // 获取用户信息
    const allOpenids = [...new Set([
      ...agentBuys.map(a => a.requesterOpenid),
      ...agentBuys.filter(a => a.agentOpenid).map(a => a.agentOpenid)
    ])]

    let userMap = {}
    if (allOpenids.length > 0) {
      const { data: users } = await db.collection('users')
        .where({ openid: _.in(allOpenids) })
        .field({ openid: true, nickName: true, avatarUrl: true })
        .get()
      users.forEach(u => { userMap[u.openid] = u })
    }

    // 脱敏返回数据，仅保留前端需要的 openid（用于聊天跳转）
    const result = agentBuys.map(a => ({
      _id: a._id,
      description: a.description,
      budget: a.budget,
      commission: a.commission,
      status: a.status,
      createTime: a.createTime,
      requesterOpenid: a.requesterOpenid,
      agentOpenid: a.agentOpenid || '',
      requester: userMap[a.requesterOpenid] || { nickName: '未知用户', avatarUrl: '' },
      agent: a.agentOpenid ? (userMap[a.agentOpenid] || { nickName: '未知用户', avatarUrl: '' }) : null,
      isRequester: a.requesterOpenid === openid,
      isAgent: a.agentOpenid === openid
    }))

    return { code: 0, message: 'success', data: result }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
