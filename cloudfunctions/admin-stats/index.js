const cloud = require('wx-server-sdk')
const { verifyAdmin } = require('./auth')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 获取今日零点的 Date 对象
// 这里使用运行时本地时间做统计边界；db.serverDate() 适合写入时间，不适合做日期区间运算。
// 如果后续需要严格按固定时区统计，再统一切换为显式时区方案。
function getTodayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// 获取 N 天前零点的 Date 对象
function getDaysAgo(n) {
  const d = getTodayStart()
  d.setDate(d.getDate() - n)
  return d
}

exports.main = async (event) => {
  try {
    const { action, token, data: reqData } = event || {}
    verifyAdmin(token)

    switch (action) {
      case 'overview': {
        const todayStart = getTodayStart()

        // 总数统计
        const { total: totalUsers } = await db.collection('users').count()
        const { total: totalProducts } = await db.collection('products').where({ status: 'on_sale' }).count()
        const { total: totalOrders } = await db.collection('orders').count()
        const { total: pendingReports } = await db.collection('reports').where({ status: 'pending' }).count()
        const { total: openDisputes } = await db.collection('orders').where({ disputeStatus: 'open' }).count()

        // 今日新增
        const { total: todayUsers } = await db.collection('users').where({ createTime: _.gte(todayStart) }).count()
        const { total: todayProducts } = await db.collection('products').where({ createTime: _.gte(todayStart) }).count()
        const { total: todayOrders } = await db.collection('orders').where({ createTime: _.gte(todayStart) }).count()

        return {
          code: 0,
          message: 'success',
          data: {
            totalUsers,
            todayUsers,
            totalProducts,
            todayProducts,
            totalOrders,
            todayOrders,
            pendingReports,
            openDisputes
          }
        }
      }

      case 'trend': {
        const { type = 'users', days = 7 } = reqData || {}
        const collectionName = type === 'users' ? 'users' : type === 'products' ? 'products' : 'orders'
        const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30)

        const result = []
        for (let i = safeDays - 1; i >= 0; i--) {
          const dayStart = getDaysAgo(i)
          const dayEnd = getDaysAgo(i - 1)
          const { total: count } = await db.collection(collectionName)
            .where({ createTime: _.gte(dayStart).and(_.lt(dayEnd)) })
            .count()

          const m = (dayStart.getMonth() + 1).toString().padStart(2, '0')
          const d = dayStart.getDate().toString().padStart(2, '0')
          result.push({ date: `${m}-${d}`, count })
        }

        return { code: 0, message: 'success', data: result }
      }

      case 'distribution': {
        const categories = ['textbook', 'electronics', 'clothing', 'daily', 'food', 'stationery', 'sports', 'other']
        const categoryNames = {
          textbook: '教材书籍',
          electronics: '电子产品',
          clothing: '服饰鞋包',
          daily: '生活用品',
          food: '食品零食',
          stationery: '文具办公',
          sports: '运动户外',
          other: '其他'
        }

        const result = []
        for (const cat of categories) {
          const { total: count } = await db.collection('products').where({ category: cat, status: 'on_sale' }).count()
          result.push({ category: cat, name: categoryNames[cat], count })
        }

        return { code: 0, message: 'success', data: result }
      }

      default:
        return { code: -1, message: '未知操作: ' + action, data: null }
    }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
