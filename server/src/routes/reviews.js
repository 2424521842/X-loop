/**
 * 评价路由
 */
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { createReview, listUserReviews } = require('../controllers/reviews')

router.post('/', authMiddleware, createReview)
router.get('/user/:id', listUserReviews)

module.exports = router
