/**
 * 管理员初始化脚本
 * 用法：ADMIN_INITIAL_PASSWORD=your_password node src/scripts/seed-admin.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Admin = require('../models/Admin')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI 环境变量未设置')

  const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin123'
  await mongoose.connect(uri)

  const passwordHash = await bcrypt.hash(password, 10)
  await Admin.findOneAndUpdate(
    { username: 'admin' },
    {
      $set: {
        password: passwordHash,
        role: 'super_admin',
        name: '超级管理员',
        status: 'active'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.log('管理员账号已初始化')
  console.log('username: admin')
  console.log(`password: ${password}`)
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('初始化管理员失败:', err)
  await mongoose.disconnect()
  process.exit(1)
})
