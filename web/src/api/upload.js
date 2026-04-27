import axios from 'axios'
import http from './http'

export function getUploadSign(params = {}) {
  return http.post('/upload/sign', params)
}

export function uploadToCloudinary(file, options = {}) {
  const cloudName = options.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = options.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  const formData = new FormData()

  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  return axios
    .post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData)
    .then((response) => response.data)
}
