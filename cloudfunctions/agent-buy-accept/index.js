const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { agentBuyId, action } = event

  if (!agentBuyId || !action) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    const { data: agentBuy } = await db.collection('agent_buys').doc(agentBuyId).get()
    if (!agentBuy) {
      return { code: -1, message: '代购需求不存在', data: null }
    }

    if (action === 'accept') {
      if (agentBuy.status !== 'open') {
        return { code: -1, message: '该需求已被接单', data: null }
      }
      if (agentBuy.requesterOpenid === openid) {
        return { code: -1, message: '不能接自己的需求', data: null }
      }
      await db.collection('agent_buys').doc(agentBuyId).update({
        data: {
          status: 'accepted',
          agentOpenid: openid,
          updateTime: db.serverDate()
        }
      })
    } else if (action === 'complete') {
      if (agentBuy.status !== 'accepted') {
        return { code: -1, message: '订单状态不允许此操作', data: null }
      }
      if (agentBuy.requesterOpenid !== openid) {
        return { code: -1, message: '只有发布者可以确认完成', data: null }
      }
      await db.collection('agent_buys').doc(agentBuyId).update({
        data: {
          status: 'completed',
          updateTime: db.serverDate()
        }
      })
    } else if (action === 'cancel') {
      if (agentBuy.requesterOpenid !== openid && agentBuy.agentOpenid !== openid) {
        return { code: -1, message: '无权操作', data: null }
      }
      await db.collection('agent_buys').doc(agentBuyId).update({
        data: {
          status: 'cancelled',
          updateTime: db.serverDate()
        }
      })
    }

    return { code: 0, message: 'success', data: null }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
