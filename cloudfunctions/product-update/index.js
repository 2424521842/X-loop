const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { id, data: updateData } = event

  if (!id) {
    return { code: -1, message: '缺少商品ID', data: null }
  }

  try {
    // 检查用户是否被封禁
    const { data: userList } = await db.collection('users').where({ openid }).limit(1).get()
    if (userList.length === 0) {
      return { code: -1, message: '用户不存在', data: null }
    }
    if (userList[0].status === 'banned') {
      return { code: -1, message: '您的账号已被封禁，无法操作', data: null }
    }

    // 验证是否为商品所有者
    const { data: product } = await db.collection('products').doc(id).get()

    if (product.sellerOpenid !== openid) {
      return { code: -1, message: '无权操作', data: null }
    }

    // 只允许更新特定字段
    const allowedFields = ['title', 'description', 'price', 'category', 'status', 'images']
    const safeData = {}
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        safeData[key] = updateData[key]
      }
    }

    // 更新前进行文本内容安全检测
    const content = ['title', 'description']
      .filter(key => Object.prototype.hasOwnProperty.call(safeData, key))
      .map(key => safeData[key])
      .filter(item => item)
      .join('\n')
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

    safeData.updateTime = db.serverDate()

    await db.collection('products').doc(id).update({ data: safeData })

    return { code: 0, message: 'success', data: null }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
