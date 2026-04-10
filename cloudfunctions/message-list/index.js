const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { targetOpenid, page = 0, pageSize = 50 } = event

  try {
    if (targetOpenid) {
      // 获取与指定用户的聊天记录
      const conversationId = [openid, targetOpenid].sort().join('_')
      const { data: messages } = await db.collection('messages')
        .where({ conversationId })
        .orderBy('createTime', 'asc')
        .skip(page * pageSize)
        .limit(pageSize)
        .get()

      // 标记对方发来的消息为已读
      await db.collection('messages')
        .where({
          conversationId,
          toOpenid: openid,
          read: false
        })
        .update({ data: { read: true } })

      // 标记哪些是自己发的，并移除 openid 字段
      const result = messages.map(msg => ({
        _id: msg._id,
        content: msg.content,
        type: msg.type,
        read: msg.read,
        createTime: msg.createTime,
        isMine: msg.fromOpenid === openid
      }))

      return { code: 0, message: 'success', data: result }
    } else {
      // 获取会话列表（每个会话的最新一条消息）
      // 查找所有与当前用户相关的消息
      const { data: allMsgs } = await db.collection('messages')
        .where(_.or([
          { fromOpenid: openid },
          { toOpenid: openid }
        ]))
        .orderBy('createTime', 'desc')
        .limit(200)
        .get()

      // 按会话分组，取每个会话最新一条
      const convMap = {}
      for (const msg of allMsgs) {
        if (!convMap[msg.conversationId]) {
          const otherOpenid = msg.fromOpenid === openid ? msg.toOpenid : msg.fromOpenid
          convMap[msg.conversationId] = {
            ...msg,
            otherOpenid,
            isMine: msg.fromOpenid === openid
          }
        }
      }

      const conversations = Object.values(convMap)

      // 批量查询对方用户信息
      const otherOpenids = [...new Set(conversations.map(c => c.otherOpenid))]
      if (otherOpenids.length > 0) {
        const { data: users } = await db.collection('users')
          .where({ openid: _.in(otherOpenids) })
          .field({ openid: true, nickName: true, avatarUrl: true })
          .get()

        const userMap = {}
        users.forEach(u => { userMap[u.openid] = u })

        conversations.forEach(c => {
          c.otherUser = userMap[c.otherOpenid] || { nickName: '未知用户', avatarUrl: '' }
        })
      }

      // 计算每个会话的未读数，并脱敏返回数据
      const safeConversations = conversations.map(conv => {
        const unreadCount = allMsgs.filter(
          m => m.conversationId === conv.conversationId && m.toOpenid === openid && !m.read
        ).length
        return {
          conversationId: conv.conversationId,
          content: conv.content,
          type: conv.type,
          createTime: conv.createTime,
          isMine: conv.isMine,
          otherOpenid: conv.otherOpenid,
          otherUser: conv.otherUser,
          unreadCount
        }
      })

      return { code: 0, message: 'success', data: safeConversations }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
