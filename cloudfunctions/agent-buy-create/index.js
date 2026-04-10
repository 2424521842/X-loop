const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { description, budget, commission } = event

  if (!description || !budget || !commission) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    const result = await db.collection('agent_buys').add({
      data: {
        description,
        budget: Number(budget),
        commission: Number(commission),
        status: 'open',
        requesterOpenid: openid,
        agentOpenid: '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return { code: 0, message: 'success', data: { id: result._id } }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
