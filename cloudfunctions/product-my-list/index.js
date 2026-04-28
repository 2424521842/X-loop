const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { status, page = 0, pageSize = 20, onlyCount = false } = event

  try {
    const baseWhere = { sellerOpenid: openid }
    const where = status ? { ...baseWhere, status } : baseWhere
    const query = db.collection('products').where(where)

    const [{ total }, statusCounts] = await Promise.all([
      db.collection('products').where(baseWhere).count(),
      Promise.all(['on_sale', 'reserved', 'sold', 'off_shelf'].map(itemStatus =>
        db.collection('products').where({ ...baseWhere, status: itemStatus }).count()
          .then(res => ({ status: itemStatus, count: res.total }))
      ))
    ])

    const counts = statusCounts.reduce((map, item) => {
      map[item.status] = item.count
      return map
    }, { all: total })

    if (onlyCount) {
      return { code: 0, message: 'success', data: { total, counts } }
    }

    const { data } = await query
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    const list = data.map(item => {
      const { sellerOpenid, ...safeItem } = item
      return safeItem
    })

    return {
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        counts
      }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: { list: [], total: 0, counts: {} } }
  }
}
