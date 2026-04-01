const { callCloud } = require('../../utils/api')
const { formatTime, CATEGORIES, PRODUCT_STATUS_TEXT } = require('../../utils/util')

Page({
  data: {
    product: null
  },

  onLoad(options) {
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

  // 我想要 - 联系卖家
  onBuy() {
    // TODO: 创建订单或跳转聊天
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onShareAppMessage() {
    const { product } = this.data
    return {
      title: product ? `${product.title} - ¥${product.price}` : 'X-Loop 二手好物',
      path: `/pages/detail/detail?id=${product._id}`
    }
  }
})
