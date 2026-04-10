const { callCloud, uploadImage } = require('../../utils/api')
const { formatTime, GROUP_BUY_STATUS_TEXT } = require('../../utils/util')

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 64,
    activeTab: 'list',
    groups: [],
    loading: true,
    showPublish: false,
    form: {
      title: '',
      description: '',
      unitPrice: '',
      targetCount: '',
      deadline: '',
      images: []
    }
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight || 20
    // 设置默认截止日期为7天后
    const d = new Date()
    d.setDate(d.getDate() + 7)
    const defaultDeadline = d.toISOString().split('T')[0]
    this.setData({
      statusBarHeight,
      navBarHeight: statusBarHeight + 44,
      'form.deadline': defaultDeadline
    })
  },

  onShow() {
    this.loadGroups()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab }, () => this.loadGroups())
  },

  async loadGroups() {
    this.setData({ loading: true })
    try {
      const params = this.data.activeTab === 'mine' ? { mine: true } : { status: 'recruiting' }
      const result = await callCloud('group-buy-list', params, false)
      const groups = (result || []).map(g => ({
        ...g,
        timeText: formatTime(new Date(g.createTime)),
        statusText: GROUP_BUY_STATUS_TEXT[g.status] || g.status,
        deadlineText: new Date(g.deadline).toLocaleDateString()
      }))
      this.setData({ groups, loading: false })
    } catch (err) {
      console.error('加载团购列表失败', err)
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

  onDateChange(e) {
    this.setData({ 'form.deadline': e.detail.value })
  },

  async chooseImage() {
    try {
      const res = await wx.chooseMedia({ count: 3, mediaType: ['image'] })
      const images = res.tempFiles.map(f => f.tempFilePath)
      this.setData({ 'form.images': [...this.data.form.images, ...images].slice(0, 3) })
    } catch (err) {
      // 用户取消选择，忽略
    }
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index
    const images = this.data.form.images.filter((_, i) => i !== idx)
    this.setData({ 'form.images': images })
  },

  async submitGroup() {
    const { title, description, unitPrice, targetCount, deadline, images } = this.data.form
    if (!title || !unitPrice || !targetCount || !deadline) {
      return wx.showToast({ title: '请填写完整信息', icon: 'none' })
    }

    wx.showLoading({ title: '发布中...' })
    try {
      // 上传图片
      const uploadedImages = []
      for (const img of images) {
        const fileID = await uploadImage(img, 'group-buy')
        uploadedImages.push(fileID)
      }

      await callCloud('group-buy-create', {
        title,
        description,
        images: uploadedImages,
        unitPrice: Number(unitPrice),
        targetCount: Number(targetCount),
        deadline
      }, false)

      wx.hideLoading()
      wx.showToast({ title: '发布成功', icon: 'success' })
      this.setData({
        showPublish: false,
        form: { title: '', description: '', unitPrice: '', targetCount: '', deadline: this.data.form.deadline, images: [] }
      })
      this.loadGroups()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  },

  async joinGroup(e) {
    const groupId = e.currentTarget.dataset.id
    const res = await wx.showModal({ title: '提示', content: '确定参加此团购吗？' })
    if (!res.confirm) return

    try {
      await callCloud('group-buy-join', { groupId })
      wx.showToast({ title: '参团成功', icon: 'success' })
      this.loadGroups()
    } catch (err) {
      wx.showToast({ title: err.message || '参团失败', icon: 'none' })
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
