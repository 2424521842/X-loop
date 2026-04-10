const { callCloud } = require('../../utils/api')
const { formatTime } = require('../../utils/util')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    conversations: [],
    loading: true
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this.setData({ statusBarHeight, navBarHeight: statusBarHeight + 44 })
  },

  onShow() {
    this.loadConversations()
  },

  async loadConversations() {
    try {
      const result = await callCloud('message-list', {}, false)
      const conversations = (result || []).map(conv => ({
        ...conv,
        timeText: formatTime(new Date(conv.createTime)),
        preview: conv.type === 'image' ? '[图片]' : conv.content
      }))
      this.setData({ conversations, loading: false })
    } catch (err) {
      console.error('加载会话列表失败', err)
      this.setData({ loading: false })
    }
  },

  goChat(e) {
    const { openid, nickname } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/chat/chat?targetOpenid=${openid}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
