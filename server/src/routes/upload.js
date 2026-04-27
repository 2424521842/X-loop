/**
 * 上传路由
 */
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { getUploadSign } = require('../controllers/upload')

router.post('/sign', authMiddleware, getUploadSign)

module.exports = router
