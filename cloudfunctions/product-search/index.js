const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { keyword, sortBy = 'time', page = 0, pageSize = 20 } = event

  if (!keyword) {
    return { code: -1, message: '请输入搜索关键词', data: [] }
  }

  try {
    // 使用正则进行模糊搜索
    const regex = db.RegExp({
      regexp: keyword,
      options: 'i'
    })

    let query = db.collection('products')
      .where({
        status: 'on_sale',
        title: regex
      })

    // 排序
    if (sortBy === 'price_asc') {
      query = query.orderBy('price', 'asc')
    } else if (sortBy === 'price_desc') {
      query = query.orderBy('price', 'desc')
    } else {
      query = query.orderBy('createTime', 'desc')
    }

    const { data } = await query
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    return { code: 0, message: 'success', data }
  } catch (err) {
    return { code: -1, message: err.message, data: [] }
  }
}
