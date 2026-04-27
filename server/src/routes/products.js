/**
 * 商品路由
 */
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const {
  listProducts,
  searchProducts,
  listMyProducts,
  getProductById,
  createProduct,
  updateProduct
} = require('../controllers/products')

router.get('/', listProducts)
router.get('/search', searchProducts)
router.get('/mine', authMiddleware, listMyProducts)
router.get('/:id', getProductById)
router.post('/', authMiddleware, createProduct)
router.patch('/:id', authMiddleware, updateProduct)

module.exports = router
