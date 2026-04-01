const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { id } = event

  if (!id) {
    return { code: -1, message: '缺少商品ID', data: null }
  }

  try {
    // 获取商品信息
    const { data: product } = await db.collection('products').doc(id).get()

    // 增加浏览量
    await db.collection('products').doc(id).update({
      data: { viewCount: _.inc(1) }
    })

    // 获取卖家信息
    const { data: sellers } = await db.collection('users')
      .where({ openid: product.sellerOpenid })
      .limit(1)
      .get()

    product.seller = sellers.length > 0 ? {
      nickName: sellers[0].nickName,
      avatarUrl: sellers[0].avatarUrl,
      credit: sellers[0].credit
    } : { nickName: '匿名用户', avatarUrl: '', credit: 100 }

    return { code: 0, message: 'success', data: product }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
