const { callCloud, ensureLogin, uploadImage } = require('../../utils/api')
const { CATEGORIES } = require('../../utils/util')

Page({
  data: {
    images: [],
    title: '',
    description: '',
    price: '',
    selectedCategory: '',
    categories: CATEGORIES,
    submitting: false
  },

  // 选择图片
  chooseImage() {
    const remaining = 9 - this.data.images.length
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          images: [...this.data.images, ...newImages]
        })
      }
    })
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 表单输入
  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  // 选择分类
  selectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.id })
  },

  // 发布商品
  async onPublish() {
    const { images, title, description, price, selectedCategory } = this.data

    // 表单验证
    if (images.length === 0) return wx.showToast({ title: '请至少上传一张图片', icon: 'none' })
    if (!title.trim()) return wx.showToast({ title: '请输入商品标题', icon: 'none' })
    if (!price || Number(price) <= 0) return wx.showToast({ title: '请输入有效价格', icon: 'none' })
    if (!selectedCategory) return wx.showToast({ title: '请选择分类', icon: 'none' })

    try {
      await ensureLogin()
    } catch (err) {
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '发布中...' })

    try {
      // 上传图片到云存储
      const imageFileIDs = await Promise.all(
        images.map(img => uploadImage(img, 'products'))
      )

      // 调用云函数创建商品
      await callCloud('product-create', {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category: selectedCategory,
        images: imageFileIDs
      }, false)

      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })

      // 返回首页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '发布失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
