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
    if (userList.length > 0 && userList[0].status === 'banned') {
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
    safeData.updateTime = db.serverDate()

    await db.collection('products').doc(id).update({ data: safeData })

    return { code: 0, message: 'success', data: null }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
