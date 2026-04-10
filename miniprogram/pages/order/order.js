const { callCloud } = require('../../utils/api')
const { formatTime, ORDER_STATUS_TEXT } = require('../../utils/util')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    activeTab: 'buyer',
    activeStatus: '',
    orders: [],
    loading: true,
    tabs: [
      { key: 'buyer', name: '我买的' },
      { key: 'seller', name: '我卖的' }
    ],
    statusTabs: [
      { key: '', name: '全部' },
      { key: 'pending', name: '待确认' },
      { key: 'confirmed', name: '已确认' },
      { key: 'completed', name: '已完成' }
    ]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    this.setData({ statusBarHeight, navBarHeight: statusBarHeight + 44 })
  },

  onShow() {
    this.loadOrders()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, activeStatus: '', orders: [] }, () => {
      this.loadOrders()
    })
  },

  switchStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ activeStatus: status, orders: [] }, () => {
      this.loadOrders()
    })
  },

  async loadOrders() {
    this.setData({ loading: true })
    try {
      const result = await callCloud('order-list', {
        role: this.data.activeTab,
        status: this.data.activeStatus || undefined
      }, false)
      const orders = (result || []).map(o => ({
        ...o,
        timeText: formatTime(new Date(o.createTime)),
        statusText: ORDER_STATUS_TEXT[o.status] || o.status
      }))
      this.setData({ orders, loading: false })
    } catch (err) {
      console.error('加载订单失败', err)
      this.setData({ loading: false })
    }
  },

  async onAction(e) {
    const { id, action } = e.currentTarget.dataset
    const actionText = { confirm: '确认', complete: '完成', cancel: '取消' }
    const res = await wx.showModal({
      title: '提示',
      content: `确定要${actionText[action]}此订单吗？`
    })
    if (!res.confirm) return

    try {
      await callCloud('order-update', { orderId: id, action })
      wx.showToast({ title: '操作成功', icon: 'success' })
      this.loadOrders()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  goChat(e) {
    const { openid, productid } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/chat/chat?targetOpenid=${openid}&productId=${productid}`
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
