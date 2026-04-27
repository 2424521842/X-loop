/**
 * 数据库种子脚本
 * 清空 users 与 email_codes 集合，插入 5 个测试用户
 * 运行：npm run seed
 */
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../src/models/User')
const EmailCode = require('../src/models/EmailCode')

const TEST_USERS = [
  {
    email: 'alice.wang@student.xjtlu.edu.cn',
    nickName: 'Alice',
    avatarUrl: '',
    campus: 'sip',
    credit: 100,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date()
  },
  {
    email: 'bob.li@student.xjtlu.edu.cn',
    nickName: 'Bob',
    avatarUrl: '',
    campus: 'tc',
    credit: 95,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date()
  },
  {
    email: 'carol.zhang@xjtlu.edu.cn',
    nickName: '张老师',
    avatarUrl: '',
    campus: 'sip',
    credit: 100,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date()
  },
  {
    email: 'dave.chen@student.xjtlu.edu.cn',
    nickName: 'Dave',
    avatarUrl: '',
    campus: '',
    credit: 80,
    status: 'active',
    emailVerified: false
  },
  {
    email: 'eve.liu@student.xjtlu.edu.cn',
    nickName: 'Eve',
    avatarUrl: '',
    campus: 'tc',
    credit: 100,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date()
  }
]

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('错误：MONGODB_URI 未设置')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('数据库已连接')

  // 清空集合
  await User.deleteMany({})
  await EmailCode.deleteMany({})
  console.log('已清空 users 和 email_codes 集合')

  // 插入测试用户
  const users = await User.insertMany(TEST_USERS)
  console.log('\n已插入以下测试用户：')
  users.forEach(u => {
    console.log(`  ${u.email}  (campus: ${u.campus || '未填写'}, verified: ${u.emailVerified})`)
  })

  console.log('\n种子数据初始化完成')
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('种子脚本运行失败:', err)
  process.exit(1)
})
