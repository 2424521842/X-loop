export const CATEGORY_DEFS = [
  { id: 'textbook', name: '教材书籍', icon: 'book', i18nKey: 'categories.textbook' },
  { id: 'electronics', name: '电子产品', icon: 'device', i18nKey: 'categories.electronics' },
  { id: 'clothing', name: '服饰鞋包', icon: 'clothing', i18nKey: 'categories.clothing' },
  { id: 'daily', name: '生活用品', icon: 'daily', i18nKey: 'categories.daily' },
  { id: 'food', name: '食品零食', icon: 'food', i18nKey: 'categories.food' },
  { id: 'stationery', name: '文具办公', icon: 'pen', i18nKey: 'categories.stationery' },
  { id: 'sports', name: '运动户外', icon: 'sports', i18nKey: 'categories.sports' },
  { id: 'other', name: '其他', icon: 'more', i18nKey: 'categories.other' }
]

export const CATEGORIES = CATEGORY_DEFS.map(({ id, name, icon }) => ({ id, name, icon }))

export const CAMPUS_OPTIONS = [
  { value: 'sip', label: '独墅湖校区 (SIP)', i18nKey: 'campus.sipFull', locationKey: 'campus.sipLocation' },
  { value: 'tc', label: '太仓校区 (TC)', i18nKey: 'campus.tcFull', locationKey: 'campus.tcLocation' }
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

export function getLocalizedCategories(t) {
  return CATEGORY_DEFS.map((category) => ({
    ...category,
    label: t(category.i18nKey),
    name: t(category.i18nKey),
    value: category.name
  }))
}

export function getCategoryValue(category) {
  const match = CATEGORY_DEFS.find((item) => item.id === category || item.name === category)
  return match?.name || category || ''
}

export function getCategoryName(category, t) {
  const match = CATEGORY_DEFS.find((item) => item.id === category || item.name === category)
  if (match) return t ? t(match.i18nKey) : match.name
  return category || (t ? t('categories.other') : '其他')
}

export function getLocalizedCampusOptions(t) {
  return CAMPUS_OPTIONS.map((campus) => ({
    ...campus,
    label: t(campus.i18nKey),
    location: t(campus.locationKey)
  }))
}

export function getCampusLabel(campus, t, fallbackKey = 'campus.unspecified') {
  if (campus === 'sip') return t ? t('campus.sipShort') : 'SIP 校区'
  if (campus === 'tc') return t ? t('campus.tcShort') : 'TC 校区'
  return t ? t(fallbackKey) : '未指定'
}

export function getCampusFullLabel(campus, t, fallbackKey = 'campus.school') {
  if (campus === 'sip') return t ? t('campus.sipFull') : '独墅湖校区 (SIP)'
  if (campus === 'tc') return t ? t('campus.tcFull') : '太仓校区 (TC)'
  return t ? t(fallbackKey) : '西交利物浦大学'
}

export function getProductStatusText(status, t) {
  if (PRODUCT_STATUS_MAP[status]) return t ? t(`status.product.${status}`) : PRODUCT_STATUS_MAP[status]
  return status || ''
}

export function getOrderStatusText(status, t) {
  if (ORDER_STATUS_MAP[status]) return t ? t(`status.order.${status}`) : ORDER_STATUS_MAP[status]
  return status || ''
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

export function formatTime(date, t) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - value.getTime()
  const minute = 60 * 1000

  if (diff < minute) return t ? t('time.justNow') : '刚刚'
  if (diff < 60 * minute) {
    const count = Math.floor(diff / minute)
    return t ? t('time.minutesAgo', { count }) : `${count}分钟前`
  }
  if (isSameDay(value, now)) {
    const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`
    return t ? t('time.todayAt', { time }) : `今天 ${time}`
  }

  const year = value.getFullYear()
  const month = pad(value.getMonth() + 1)
  const day = pad(value.getDate())
  return `${year}-${month}-${day}`
}

export function formatPrice(num) {
  const value = Number(num)
  return `￥${Number.isFinite(value) ? value.toFixed(2) : '0.00'}`
}
