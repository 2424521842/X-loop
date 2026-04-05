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
    history: [],
    loading: false,
    statusBarHeight: 0,
    navBarHeight: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    const navBarHeight = statusBarHeight + 44
    this.setData({
      statusBarHeight,
      navBarHeight,
      history: wx.getStorageSync(HISTORY_KEY) || []
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 执行搜索
  async onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) return

    this.saveHistory(keyword)
    this.setData({ loading: true })

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
        hasSearched: true,
        loading: false
      })
    } catch (err) {
      this.setData({ hasSearched: true, results: [], loading: false })
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
