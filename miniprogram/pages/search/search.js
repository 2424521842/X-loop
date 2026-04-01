const { callCloud } = require('../../utils/api')
const { CATEGORIES } = require('../../utils/util')

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10

Page({
  data: {
    keyword: '',
    results: [],
    hasSearched: false,
    sortBy: 'time',
    history: []
  },

  onLoad() {
    this.setData({
      history: wx.getStorageSync(HISTORY_KEY) || []
    })
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 执行搜索
  async onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) return

    this.saveHistory(keyword)

    try {
      const results = await callCloud('product-search', {
        keyword,
        sortBy: this.data.sortBy
      })

      this.setData({
        results: (results || []).map(item => ({
          ...item,
          categoryName: CATEGORIES.find(c => c.id === item.category)?.name || ''
        })),
        hasSearched: true
      })
    } catch (err) {
      this.setData({ hasSearched: true, results: [] })
    }
  },

  // 排序切换
  changeSort(e) {
    this.setData({ sortBy: e.currentTarget.dataset.sort })
    if (this.data.keyword.trim()) {
      this.onSearch()
    }
  },

  // 从历史搜索
  searchFromHistory(e) {
    this.setData({ keyword: e.currentTarget.dataset.keyword })
    this.onSearch()
  },

  // 保存搜索历史
  saveHistory(keyword) {
    let history = this.data.history.filter(h => h !== keyword)
    history.unshift(keyword)
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY)
    this.setData({ history })
    wx.setStorageSync(HISTORY_KEY, history)
  },

  // 清空历史
  clearHistory() {
    this.setData({ history: [] })
    wx.removeStorageSync(HISTORY_KEY)
  },

  // 跳转详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
