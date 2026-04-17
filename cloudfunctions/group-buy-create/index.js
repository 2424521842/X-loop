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
    // 发布前进行文本内容安全检测
    const content = [title, description].filter(item => item).join('\n')
    if (content.length > 0) {
      let secCheckResult
      try {
        secCheckResult = await cloud.openapi.security.msgSecCheck({
          version: 2,
          scene: 2,
          openid,
          content
        })
      } catch (err) {
        return { code: -1, message: '内容安全检测失败，请稍后重试', data: null }
      }

      const suggest = secCheckResult && secCheckResult.result ? secCheckResult.result.suggest : ''
      if (suggest === 'risky' || suggest === 'review') {
        return { code: -1, message: '内容包含违规信息，请修改后重试', data: null }
      }
    }

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
