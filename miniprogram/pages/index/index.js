const { callCloud } = require('../../utils/api')
const { formatTime, CATEGORIES } = require('../../utils/util')

Page({
  data: {
    products: [],
    categories: CATEGORIES,
    currentCategory: '',
    loading: false,
    noMore: false,
    page: 0,
    pageSize: 10
  },

  onLoad() {
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.setData({ page: 0, noMore: false, products: [] })
    this.loadProducts().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadProducts()
    }
  },

  // 加载商品列表
  async loadProducts() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const list = await callCloud('product-list', {
        category: this.data.currentCategory,
        page: this.data.page,
        pageSize: this.data.pageSize
      }, false)

      const products = (list || []).map(item => ({
        ...item,
        timeText: formatTime(new Date(item.createTime)),
        categoryName: CATEGORIES.find(c => c.id === item.category)?.name || ''
      }))

      this.setData({
        products: [...this.data.products, ...products],
        page: this.data.page + 1,
        noMore: products.length < this.data.pageSize,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  // 切换分类
  switchCategory(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      currentCategory: id,
      page: 0,
      noMore: false,
      products: []
    })
    this.loadProducts()
  },

  // 跳转搜索页
  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // 跳转商品详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
