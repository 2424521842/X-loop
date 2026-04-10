const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { targetOpenid, content, type = 'text' } = event

  if (!targetOpenid || !content) {
    return { code: -1, message: '参数不完整', data: null }
  }

  // 不能给自己发消息
  if (targetOpenid === openid) {
    return { code: -1, message: '不能给自己发消息', data: null }
  }

  // 消息类型校验
  const allowedTypes = ['text', 'image']
  if (!allowedTypes.includes(type)) {
    return { code: -1, message: '不支持的消息类型', data: null }
  }

  // 内容长度校验
  if (typeof content === 'string' && content.length > 2000) {
    return { code: -1, message: '消息内容过长', data: null }
  }

  try {
    // 生成会话ID（两人之间的唯一标识，按字母序拼接确保一致性）
    const conversationId = [openid, targetOpenid].sort().join('_')

    const result = await db.collection('messages').add({
      data: {
        conversationId,
        fromOpenid: openid,
        toOpenid: targetOpenid,
        content,
        type,
        read: false,
        createTime: db.serverDate()
      }
    })

    return { code: 0, message: 'success', data: { id: result._id } }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
