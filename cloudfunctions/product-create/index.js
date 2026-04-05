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
    if (userList.length > 0 && userList[0].status === 'banned') {
      return { code: -1, message: '您的账号已被封禁，无法发布商品', data: null }
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
