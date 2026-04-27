/**
 * 消息路由
 */
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { createMessage, listConversations, listMessagesWithUser } = require('../controllers/messages')

router.post('/', authMiddleware, createMessage)
router.get('/conversations', authMiddleware, listConversations)
router.get('/:userId', authMiddleware, listMessagesWithUser)

module.exports = router
