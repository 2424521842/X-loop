/**
 * Cloudinary unsigned upload 配置
 */
function getUploadConfig(folder) {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
    folder
  }
}

module.exports = { getUploadConfig }
