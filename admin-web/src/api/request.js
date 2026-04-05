import axios from 'axios'
import { ElMessage } from 'element-plus'

// 云函数 HTTP 触发器的基础 URL - 部署后替换为实际地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-cloud-env.service.tcloudbase.com'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 30000
})

// 请求拦截器：添加 token
request.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      if (res.message && res.message.includes('令牌已过期')) {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
      }
      return Promise.reject(new Error(res.message))
    }
    return res.data
  },
  error => {
    ElMessage.error('网络异常，请重试')
    return Promise.reject(error)
  }
)

/**
 * 调用管理端云函数
 * @param {string} funcName - 云函数名称 (如 'admin-login')
 * @param {object} data - 请求数据 (含 action 和 data 字段)
 */
export function callAdminApi(funcName, data = {}) {
  const token = localStorage.getItem('admin_token')
  return request.post(`/${funcName}`, { ...data, token })
}

export default request
