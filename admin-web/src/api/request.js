import { ElMessage } from 'element-plus'

const baseURL = import.meta.env.VITE_API_BASE || '/api/admin'

function buildUrl(path, params) {
  const isAbsolute = /^https?:\/\//i.test(baseURL)
  const url = new URL(`${baseURL}${path}`, isAbsolute ? undefined : window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }
  return isAbsolute ? url.toString() : url.pathname + url.search
}

async function request(method, path, options = {}) {
  const token = localStorage.getItem('admin_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const res = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body: options.data === undefined ? undefined : JSON.stringify(options.data)
    })
    const result = await res.json()

    if (res.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_role')
      window.location.href = '/login'
    }

    if (result.code !== 0) {
      ElMessage.error(result.message || '请求失败')
      throw new Error(result.message || '请求失败')
    }

    return result.data
  } catch (err) {
    if (!err.message || err.message === 'Failed to fetch') {
      ElMessage.error('网络异常，请重试')
    }
    throw err
  }
}

export default {
  get(path, options) {
    return request('GET', path, options)
  },
  post(path, data, options = {}) {
    return request('POST', path, { ...options, data })
  },
  patch(path, data, options = {}) {
    return request('PATCH', path, { ...options, data })
  },
  delete(path, options) {
    return request('DELETE', path, options)
  }
}
