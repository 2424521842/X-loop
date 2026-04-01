/**
 * 云函数调用封装
 * 统一处理错误和loading状态
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 传递的参数
 * @param {boolean} showLoading - 是否显示loading
 * @returns {Promise}
 */
function callCloud(name, data = {}, showLoading = true) {
  if (showLoading) {
    wx.showLoading({ title: '加载中...' })
  }

  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
    if (showLoading) wx.hideLoading()
    if (res.result && res.result.code === 0) {
      return res.result.data
    }
    throw new Error(res.result ? res.result.message : '请求失败')
  }).catch(err => {
    if (showLoading) wx.hideLoading()
    console.error(`[云函数 ${name}] 调用失败:`, err)
    wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    throw err
  })
}

/**
 * 上传图片到云存储
 * @param {string} filePath - 本地文件路径
 * @param {string} cloudDir - 云存储目录
 * @returns {Promise<string>} 云文件ID
 */
function uploadImage(filePath, cloudDir = 'products') {
  const ext = filePath.split('.').pop()
  const cloudPath = `${cloudDir}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`

  return wx.cloud.uploadFile({
    cloudPath,
    filePath
  }).then(res => res.fileID)
}

/**
 * 获取临时图片链接
 * @param {string[]} fileList - 云文件ID数组
 * @returns {Promise<string[]>} 临时链接数组
 */
function getTempFileURL(fileList) {
  if (!fileList || fileList.length === 0) return Promise.resolve([])

  return wx.cloud.getTempFileURL({
    fileList
  }).then(res => res.fileList.map(f => f.tempFileURL))
}

module.exports = {
  callCloud,
  uploadImage,
  getTempFileURL
}
