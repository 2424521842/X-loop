import { defineStore } from 'pinia'
import { getMe } from '../api/auth'

let bootPromise = null

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('xloop_token') || '',
    user: null,
    ready: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token)
  },
  actions: {
    async boot() {
      if (this.ready) return
      if (bootPromise) return bootPromise

      bootPromise = (async () => {
        try {
          if (this.token) {
            this.user = await getMe()
          }
        } catch (error) {
          this.token = ''
          this.user = null
          localStorage.removeItem('xloop_token')
        } finally {
          this.ready = true
          bootPromise = null
        }
      })()

      return bootPromise
    },
    async refresh() {
      if (!this.token) return null
      this.user = await getMe()
      return this.user
    },
    login(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('xloop_token', token)
    },
    async logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('xloop_token')

      const { default: router } = await import('../router')
      if (router.currentRoute.value.path !== '/login') {
        router.replace('/login')
      }
    },
    setUser(user) {
      this.user = user
    }
  }
})
