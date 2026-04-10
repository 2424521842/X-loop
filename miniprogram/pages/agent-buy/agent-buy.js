const { callCloud } = require('../../utils/api')
const { formatTime, AGENT_BUY_STATUS_TEXT } = require('../../utils/util')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    activeTab: 'list',
    agentBuys: [],
    loading: true,
    showPublish: false,
    form: {
      description: '',
      budget: '',
      commission: ''
    }
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this.setData({ statusBarHeight, navBarHeight: statusBarHeight + 44 })
  },

  onShow() {
    this.loadList()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab }, () => this.loadList())
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const params = this.data.activeTab === 'mine' ? { mine: true } : { status: 'open' }
      const result = await callCloud('agent-buy-list', params, false)
      const agentBuys = (result || []).map(a => ({
        ...a,
        timeText: formatTime(new Date(a.createTime)),
        statusText: AGENT_BUY_STATUS_TEXT[a.status] || a.status
      }))
      this.setData({ agentBuys, loading: false })
    } catch (err) {
      console.error('加载代购列表失败', err)
      this.setData({ loading: false })
    }
  },

  togglePublish() {
    this.setData({ showPublish: !this.data.showPublish })
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  async submitAgentBuy() {
    const { description, budget, commission } = this.data.form
    if (!description || !budget || !commission) {
      return wx.showToast({ title: '请填写完整信息', icon: 'none' })
    }

    try {
      await callCloud('agent-buy-create', {
        description,
        budget: Number(budget),
        commission: Number(commission)
      })
      wx.showToast({ title: '发布成功', icon: 'success' })
      this.setData({
        showPublish: false,
        form: { description: '', budget: '', commission: '' }
      })
      this.loadList()
    } catch (err) {
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  },

  async onAction(e) {
    const { id, action } = e.currentTarget.dataset
    const actionText = { accept: '接单', complete: '确认完成', cancel: '取消' }
    const res = await wx.showModal({ title: '提示', content: `确定要${actionText[action]}吗？` })
    if (!res.confirm) return

    try {
      await callCloud('agent-buy-accept', { agentBuyId: id, action })
      wx.showToast({ title: '操作成功', icon: 'success' })
      this.loadList()
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  goChat(e) {
    const openid = e.currentTarget.dataset.openid
    wx.navigateTo({ url: `/pages/chat/chat?targetOpenid=${openid}` })
  },

  goBack() {
    wx.navigateBack()
  }
})
