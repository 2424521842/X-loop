const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { title, description, images = [], unitPrice, targetCount, deadline } = event

  if (!title || !unitPrice || !targetCount || !deadline) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    const result = await db.collection('group_buys').add({
      data: {
        title,
        description: description || '',
        images,
        unitPrice: Number(unitPrice),
        targetCount: Number(targetCount),
        currentCount: 1,
        participants: [openid],
        status: 'recruiting',
        creatorOpenid: openid,
        deadline: new Date(deadline),
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return { code: 0, message: 'success', data: { id: result._id } }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
