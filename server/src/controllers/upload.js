/**
 * 上传配置控制器
 */
const { success, fail } = require('../utils/response')
const { getUploadConfig } = require('../services/cloudinary')

const ALLOWED_FOLDERS = ['products', 'avatars', 'messages']

/**
 * POST /api/upload/sign
 * 返回 Cloudinary unsigned upload 所需配置
 */
async function getUploadSign(req, res, next) {
  try {
    const folder = req.body.folder || 'products'
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return res.status(400).json(fail('无效的上传目录'))
    }

    return res.json(success(getUploadConfig(folder)))
  } catch (err) {
    next(err)
  }
}

module.exports = { getUploadSign }
