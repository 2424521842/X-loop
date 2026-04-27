/**
 * 管理端统计控制器
 */
const User = require('../../models/User')
const Product = require('../../models/Product')
const Order = require('../../models/Order')
const Report = require('../../models/Report')
const { success } = require('../../utils/response')

const CATEGORY_NAMES = {
  textbook: '教材书籍',
  electronics: '电子产品',
  clothing: '服饰鞋包',
  daily: '生活用品',
  food: '食品零食',
  stationery: '文具办公',
  sports: '运动户外',
  other: '其他'
}

function getTodayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDaysAgo(n) {
  const d = getTodayStart()
  d.setDate(d.getDate() - n)
  return d
}

async function overview(req, res, next) {
  try {
    const todayStart = getTodayStart()
    const [totalUsers, totalProducts, totalOrders, pendingReports, openDisputes, todayUsers, todayProducts, todayOrders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ status: 'on_sale' }),
      Order.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Order.countDocuments({ intervened: true, resolvedTime: null }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Product.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: todayStart } })
    ])

    return res.json(success({ totalUsers, todayUsers, totalProducts, todayProducts, totalOrders, todayOrders, pendingReports, openDisputes }))
  } catch (err) {
    next(err)
  }
}

async function trend(req, res, next) {
  try {
    const type = req.query.type || 'users'
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 30)
    const Model = type === 'products' ? Product : type === 'orders' ? Order : User
    const result = []

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = getDaysAgo(i)
      const dayEnd = getDaysAgo(i - 1)
      const count = await Model.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } })
      const m = String(dayStart.getMonth() + 1).padStart(2, '0')
      const d = String(dayStart.getDate()).padStart(2, '0')
      result.push({ date: `${m}-${d}`, count })
    }

    return res.json(success(result))
  } catch (err) {
    next(err)
  }
}

async function distribution(req, res, next) {
  try {
    const categories = Object.keys(CATEGORY_NAMES)
    const result = []
    for (const category of categories) {
      const count = await Product.countDocuments({ category, status: 'on_sale' })
      result.push({ category, id: category, name: CATEGORY_NAMES[category], count })
    }
    return res.json(success(result))
  } catch (err) {
    next(err)
  }
}

module.exports = { overview, trend, distribution, CATEGORY_NAMES }
