import axios from 'axios'
import { ElMessage } from 'element-plus'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../i18n/messages'
import { translate } from '../utils/i18n'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000
})

function getCurrentFullPath(router) {
  return router.currentRoute.value.fullPath || '/'
}

function t(key, params) {
  const locale = SUPPORTED_LOCALES.includes(localStorage.getItem('xloop_locale'))
    ? localStorage.getItem('xloop_locale')
    : DEFAULT_LOCALE
  return translate(locale, key, params)
}

async function clearSessionAndRedirect() {
  localStorage.removeItem('xloop_token')

  try {
    const [{ useUserStore }, { default: router }] = await Promise.all([
      import('../store/user'),
      import('../router')
    ])
    const userStore = useUserStore()
    userStore.setUser(null)
    userStore.token = ''

    const currentPath = getCurrentFullPath(router)
    if (currentPath !== '/login') {
      router.replace({
        path: '/login',
        query: currentPath === '/' ? {} : { redirect: currentPath }
      })
    }
  } catch (error) {
    window.location.href = '/login'
  }
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('xloop_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && body.code === 0) return body.data

    const message = body?.message || t('common.requestFailed')
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
  async (error) => {
    if (error.response?.status === 401) {
      ElMessage.error(t('common.sessionExpired'))
      await clearSessionAndRedirect()
      return Promise.reject(error)
    }

    const message = error.response?.data?.message || t('common.networkError')
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default http
