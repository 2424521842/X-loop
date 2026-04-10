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
