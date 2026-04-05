const { callCloud } = require('../../utils/api')

Page({
  data: {
    userInfo: null,
    stats: {},
    statusBarHeight: 0,
    navBarHeight: 0
  },

  onShow() {
    // 计算状态栏和导航栏高度（自定义导航需要）
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: sysInfo.statusBarHeight + 44
    })
    this.checkLogin()
  },

  // 检查登录状态
  async checkLogin() {
    const app = getApp()
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo })
      this.loadStats()
    }
  },

  // 登录
  async onLogin() {
    try {
      const result = await callCloud('user-login', {})
      const app = getApp()
      app.globalData.userInfo = result.userInfo
      app.globalData.openid = result.openid
      this.setData({ userInfo: result.userInfo })
      this.loadStats()
    } catch (err) {
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
  },

  // 加载统计数据
  async loadStats() {
    // TODO: 从云函数获取用户统计数据
    this.setData({
      stats: { published: 0, sold: 0, bought: 0 }
    })
  },

  goMyProducts() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goMyOrders() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goMyFavorites() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  goAbout() {
    wx.showToast({ title: 'X-Loop v1.0 | XJTLU', icon: 'none' })
  },

  goFeedback() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
