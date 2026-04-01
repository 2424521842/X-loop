/**
 * 通用工具函数
 */

/**
 * 格式化时间
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const now = new Date()
  const diff = now - date
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return Math.floor(diff / minute) + '分钟前'
  if (diff < day) return Math.floor(diff / hour) + '小时前'
  if (diff < 7 * day) return Math.floor(diff / day) + '天前'

  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 格式化价格
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  return Number(price).toFixed(2)
}

/**
 * 商品状态映射
 */
const PRODUCT_STATUS = {
  ON_SALE: 'on_sale',       // 在售
  RESERVED: 'reserved',     // 已预订
  SOLD: 'sold',             // 已售出
  OFF_SHELF: 'off_shelf'    // 已下架
}

const PRODUCT_STATUS_TEXT = {
  on_sale: '在售',
  reserved: '已预订',
  sold: '已售出',
  off_shelf: '已下架'
}

/**
 * 商品分类
 */
const CATEGORIES = [
  { id: 'textbook', name: '教材书籍' },
  { id: 'electronics', name: '电子产品' },
  { id: 'clothing', name: '服饰鞋包' },
  { id: 'daily', name: '生活用品' },
  { id: 'food', name: '食品零食' },
  { id: 'stationery', name: '文具办公' },
  { id: 'sports', name: '运动户外' },
  { id: 'other', name: '其他' }
]

module.exports = {
  formatTime,
  formatPrice,
  PRODUCT_STATUS,
  PRODUCT_STATUS_TEXT,
  CATEGORIES
}
