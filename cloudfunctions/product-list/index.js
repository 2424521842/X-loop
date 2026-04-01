const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { category, page = 0, pageSize = 10 } = event

  try {
    let query = db.collection('products')
      .where({ status: 'on_sale' })

    // 按分类筛选
    if (category) {
      query = query.where({ status: 'on_sale', category })
    }

    const { data } = await query
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    return { code: 0, message: 'success', data }
  } catch (err) {
    return { code: -1, message: err.message, data: [] }
  }
}
