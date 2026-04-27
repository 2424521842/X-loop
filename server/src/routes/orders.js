/**
 * 订单路由
 */
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { createOrder, listOrders, updateOrderStatus } = require('../controllers/orders')

router.post('/', authMiddleware, createOrder)
router.get('/', authMiddleware, listOrders)
router.patch('/:id', authMiddleware, updateOrderStatus)

module.exports = router
