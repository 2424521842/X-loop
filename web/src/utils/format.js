export const CATEGORIES = [
  { id: 'textbook', name: '教材书籍', icon: 'book' },
  { id: 'electronics', name: '电子产品', icon: 'device' },
  { id: 'clothing', name: '服饰鞋包', icon: 'clothing' },
  { id: 'daily', name: '生活用品', icon: 'daily' },
  { id: 'food', name: '食品零食', icon: 'food' },
  { id: 'stationery', name: '文具办公', icon: 'pen' },
  { id: 'sports', name: '运动户外', icon: 'sports' },
  { id: 'other', name: '其他', icon: 'more' }
]

export const CAMPUS_OPTIONS = [
  { value: 'sip', label: '独墅湖校区 (SIP)' },
  { value: 'tc', label: '太仓校区 (TC)' }
]

export const PRODUCT_STATUS_MAP = {
  on_sale: '在售',
  reserved: '已预订',
  sold: '已售出',
  off_shelf: '已下架'
}

export const ORDER_STATUS_MAP = {
  pending: '待同意',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

export function formatTime(date) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - value.getTime()
  const minute = 60 * 1000

  if (diff < minute) return '刚刚'
  if (diff < 60 * minute) return `${Math.floor(diff / minute)}分钟前`
  if (isSameDay(value, now)) return `今天 ${pad(value.getHours())}:${pad(value.getMinutes())}`

  const year = value.getFullYear()
  const month = pad(value.getMonth() + 1)
  const day = pad(value.getDate())
  return `${year}-${month}-${day}`
}

export function formatPrice(num) {
  const value = Number(num)
  return `￥${Number.isFinite(value) ? value.toFixed(2) : '0.00'}`
}
