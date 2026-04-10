const { callCloud } = require('../../utils/api')
const { formatTime } = require('../../utils/util')

Component({
  properties: {
    targetOpenid: { type: String, value: '' }
  },

  data: {
    reviews: [],
    loading: true
  },

  lifetimes: {
    attached() {
      if (this.properties.targetOpenid) {
        this.loadReviews()
      }
    }
  },

  observers: {
    'targetOpenid': function(val) {
      if (val) this.loadReviews()
    }
  },

  methods: {
    async loadReviews() {
      try {
        const result = await callCloud('review-list', {
          targetOpenid: this.properties.targetOpenid
        }, false)
        const reviews = (result || []).map(r => ({
          ...r,
          timeText: formatTime(new Date(r.createTime)),
          stars: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
        }))
        this.setData({ reviews, loading: false })
      } catch (err) {
        console.error('加载评价失败', err)
        this.setData({ loading: false })
      }
    }
  }
})
