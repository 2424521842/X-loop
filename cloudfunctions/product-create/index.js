const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { title, description, price, category, images } = event

  // 参数校验
  if (!title || !price || !category || !images || images.length === 0) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    // 检查用户是否被封禁
    const { data: userList } = await db.collection('users').where({ openid }).limit(1).get()
    if (userList.length === 0) {
      return { code: -1, message: '用户不存在', data: null }
    }
    if (userList[0].status === 'banned') {
      return { code: -1, message: '您的账号已被封禁，无法发布商品', data: null }
    }

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

    const result = await db.collection('products').add({
      data: {
        title,
        description: description || '',
        price: Number(price),
        category,
        images,
        status: 'on_sale',
        sellerOpenid: openid,
        viewCount: 0,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return {
      code: 0,
      message: 'success',
      data: { id: result._id }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
