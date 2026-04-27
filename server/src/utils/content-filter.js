/**
 * 简单内容黑名单过滤
 */
const KEYWORDS = ['赌博', '博彩', '色情', '外挂', '代购代办', '约炮', '卖号', '刷单', '解锁', '破解']

function containsBlockedKeyword(text) {
  const value = String(text || '')
  return KEYWORDS.some(keyword => value.includes(keyword))
}

module.exports = { KEYWORDS, containsBlockedKeyword }
