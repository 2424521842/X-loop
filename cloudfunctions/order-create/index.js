const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { productId } = event

  if (!productId) {
    return { code: -1, message: '参数不完整', data: null }
  }

  try {
    // 查询商品
    const { data: product } = await db.collection('products').doc(productId).get()

    if (!product) {
      return { code: -1, message: '商品不存在', data: null }
    }
    if (product.status !== 'on_sale') {
      return { code: -1, message: '商品已不在售', data: null }
    }
    if (product.sellerOpenid === openid) {
      return { code: -1, message: '不能购买自己的商品', data: null }
    }

    // 创建订单
    const result = await db.collection('orders').add({
      data: {
        productId,
        productTitle: product.title,
        productImage: product.images[0] || '',
        price: product.price,
        buyerOpenid: openid,
        sellerOpenid: product.sellerOpenid,
        status: 'pending',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    // 将商品状态改为已预订
    await db.collection('products').doc(productId).update({
      data: {
        status: 'reserved',
        updateTime: db.serverDate()
      }
    })

    return { code: 0, message: 'success', data: { id: result._id } }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
