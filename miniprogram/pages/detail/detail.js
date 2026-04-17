const { callCloud, ensureLogin } = require('../../utils/api')
const { formatTime, CATEGORIES, PRODUCT_STATUS_TEXT } = require('../../utils/util')

Page({
  data: {
    product: null,
    statusBarHeight: 20,
    navBarHeight: 64,
    currentImageIndex: 0,
    backArrow: '<'
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this.setData({ statusBarHeight, navBarHeight: statusBarHeight + 44 })
    if (options.id) {
      this.loadProduct(options.id)
    }
  },

  async loadProduct(id) {
    try {
      const product = await callCloud('product-detail', { id })
      this.setData({
        product: {
          ...product,
          timeText: formatTime(new Date(product.createTime)),
          categoryName: CATEGORIES.find(c => c.id === product.category)?.name || '',
          statusText: PRODUCT_STATUS_TEXT[product.status] || '在售'
        }
      })
    } catch (err) {
      wx.showToast({ title: '商品不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.product.images[index],
      urls: this.data.product.images
    })
  },

  // 我想要 - 创建订单
  async onBuy() {
    try {
      await ensureLogin()
    } catch (err) {
      return
    }
    const res = await wx.showModal({
      title: '确认购买',
      content: `确定要购买「${this.data.product.title}」吗？价格：¥${this.data.product.price}`
    })
    if (!res.confirm) return

    try {
      await callCloud('order-create', { productId: this.data.product._id })
      wx.showToast({ title: '下单成功', icon: 'success' })
      this.loadProduct(this.data.product._id)
    } catch (err) {
      wx.showToast({ title: err.message || '下单失败', icon: 'none' })
    }
  },

  // 聊一聊 - 联系卖家
  async goChat() {
    if (!this.data.product) return
    try {
      await ensureLogin()
    } catch (err) {
      return
    }
    wx.navigateTo({
      url: `/pages/chat/chat?targetOpenid=${this.data.product.sellerOpenid}&productId=${this.data.product._id}`
    })
  },

  onShareAppMessage() {
    const { product } = this.data
    return {
      title: product ? `${product.title} - ¥${product.price}` : 'X-Loop 二手好物',
      path: `/pages/detail/detail?id=${product._id}`
    }
  },

  goBack() {
    wx.navigateBack()
  },

  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current })
  }
})
