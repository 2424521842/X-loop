const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { groupId } = event

  if (!groupId) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    const { data: group } = await db.collection('group_buys').doc(groupId).get()

    if (!group) {
      return { code: -1, message: '团购不存在', data: null }
    }
    if (group.status !== 'recruiting') {
      return { code: -1, message: '团购已结束', data: null }
    }
    if (new Date(group.deadline) < new Date()) {
      return { code: -1, message: '团购已过期', data: null }
    }
    if (group.participants.includes(openid)) {
      return { code: -1, message: '您已参加此团购', data: null }
    }

    const newCount = group.currentCount + 1
    const newStatus = newCount >= group.targetCount ? 'success' : 'recruiting'

    await db.collection('group_buys').doc(groupId).update({
      data: {
        participants: _.push(openid),
        currentCount: _.inc(1),
        status: newStatus,
        updateTime: db.serverDate()
      }
    })

    return { code: 0, message: 'success', data: { newCount, newStatus } }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
