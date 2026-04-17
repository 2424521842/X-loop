const { callCloud, ensureLogin } = require('../../utils/api')
const { formatTime } = require('../../utils/util')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    backArrow: '<',
    messages: [],
    inputValue: '',
    product: null,
    otherUser: null,
    scrollToView: ''
  },

  onLoad(options) {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this.setData({ statusBarHeight, navBarHeight: statusBarHeight + 44 })

    // 加载聊天对象和商品信息
    if (options.productId) {
      this.loadProduct(options.productId)
    }
    if (options.targetOpenid) {
      this.data.targetOpenid = options.targetOpenid
      this.loadMessages()
      this.startWatcher()
    }
  },

  // 加载商品信息
  async loadProduct(id) {
    try {
      const product = await callCloud('product-detail', { id })
      this.setData({ product })
    } catch (err) {
      console.error('加载商品信息失败', err)
    }
  },

  // 加载消息列表
  async loadMessages() {
    try {
      const result = await callCloud('message-list', {
        targetOpenid: this.data.targetOpenid
      }, false)
      const messages = (result || []).map(msg => ({
        ...msg,
        timeText: formatTime(new Date(msg.createTime)),
        isMine: msg.isMine || false
      }))
      this.setData({
        messages,
        scrollToView: messages.length ? 'msg-' + (messages.length - 1) : ''
      })
    } catch (err) {
      console.error('加载消息失败', err)
    }
  },

  startWatcher() {
    const db = wx.cloud.database()
    const conversationId = [getApp().globalData.openid, this.data.targetOpenid].sort().join('_')
    this._watcher = db.collection('messages')
      .where({ conversationId })
      .orderBy('createTime', 'asc')
      .watch({
        onChange: (snapshot) => {
          if (snapshot.type !== 'init') {
            this.loadMessages()
          }
        },
        onError: (err) => {
          console.error('消息监听失败', err)
        }
      })
  },

  // 输入消息
  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  // 发送消息
  async sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content) return

    try {
      await ensureLogin()
    } catch (err) {
      return
    }

    // 先在本地显示
    const newMsg = {
      _id: 'temp-' + Date.now(),
      content,
      isMine: true,
      timeText: '刚刚',
      type: 'text'
    }
    const messages = [...this.data.messages, newMsg]
    this.setData({
      messages,
      inputValue: '',
      scrollToView: 'msg-' + (messages.length - 1)
    })

    // 发送到云端
    try {
      await callCloud('message-send', {
        targetOpenid: this.data.targetOpenid,
        content,
        type: 'text'
      }, false)
    } catch (err) {
      wx.showToast({ title: '发送失败', icon: 'none' })
    }
  },

  // 查看商品详情
  goProductDetail() {
    if (this.data.product) {
      wx.navigateTo({ url: '/pages/detail/detail?id=' + this.data.product._id })
    }
  },

  goBack() {
    wx.navigateBack()
  },

  onUnload() {
    if (this._watcher) {
      this._watcher.close()
    }
  }
})
