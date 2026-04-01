# X-Loop 项目指南

## 项目概述
X-Loop 是面向西交利物浦大学 (XJTLU) 师生的二手闲置交易微信小程序。
课程项目：ENT208TC Session 2 Group 27，7人团队，整学期开发周期。

## 技术栈
- **前端**：微信原生小程序（WXML + WXSS + JavaScript）
- **后端**：微信云开发（云函数 Node.js + 云数据库 NoSQL + 云存储）
- **UI 框架**：WeUI 组件库
- **设计工具**：Figma

## 项目结构
```
X-loop/
├── miniprogram/           # 小程序前端
│   ├── pages/             # 页面（每个页面一个文件夹，含 .wxml/.wxss/.js/.json）
│   ├── components/        # 公共组件（同样每个组件含四个文件）
│   ├── utils/api.js       # 云函数调用封装（callCloud / uploadImage / getTempFileURL）
│   ├── utils/util.js      # 工具函数与常量（formatTime / CATEGORIES / PRODUCT_STATUS）
│   ├── images/            # 静态资源
│   └── app.js / app.json / app.wxss  # 全局配置与样式
├── cloudfunctions/        # 云函数（每个函数一个文件夹，含 index.js + package.json）
├── project.config.json    # 小程序项目配置
└── TODO.md                # 开发任务清单（89项任务，持续更新）
```

## 编码规范

### 小程序前端
- 页面文件始终为四件套：`.wxml` `.wxss` `.js` `.json`
- 使用 `app.wxss` 中已定义的通用工具类（flex-row, flex-between, card, btn-primary, price, tag 等），不要重复定义
- 使用 `utils/api.js` 中的 `callCloud()` 调用云函数，不要直接写 `wx.cloud.callFunction`
- 使用 `utils/util.js` 中的 `CATEGORIES` 和 `PRODUCT_STATUS` 常量，不要硬编码分类和状态
- 样式使用 rpx 单位，颜色遵循 XJTLU 品牌色方案：
  - 深蓝紫 `#010544`（导航栏左侧、选中态文字）
  - 亮紫粉 `#CE57C1`（按钮、导航栏右侧、主要交互元素）
  - 渐变 `linear-gradient(to right, #010544, #CE57C1)`（导航栏、个人中心头部）
  - 淡紫背景 `#F0E6F6`（标签选中态、轻量高亮）
  - 页面背景 `#F5F3F7`（淡紫灰）
  - 价格红 `#ff4d4f`
  - 灰色文字 `#999`
- 图片组件必须设置 `mode="aspectFill"` 和 `lazy-load`

### 云函数
- 每个云函数的返回格式统一为：`{ code: 0, message: 'success', data: ... }`，错误时 `code: -1`
- 开头必须初始化：`cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`
- 涉及用户数据修改的操作必须验证 openid 所有权
- 使用 `db.serverDate()` 记录时间，不要用 `new Date()`

### 通用
- 代码注释使用中文
- 变量名和函数名使用英文 camelCase
- 文件名使用 kebab-case（如 `product-list`、`group-buy`）

## 数据库集合 Schema

### users
`{ openid, nickName, avatarUrl, credit(信誉分), createTime, updateTime }`

### products
`{ title, description, images[], price, category, status(on_sale/reserved/sold/off_shelf), sellerOpenid, viewCount, createTime, updateTime }`

### orders
`{ productId, buyerOpenid, sellerOpenid, status(pending/confirmed/completed/cancelled), price, createTime, updateTime }`

### reviews
`{ orderId, fromOpenid, toOpenid, rating(1-5), content, createTime }`

### messages
`{ fromOpenid, toOpenid, content, type(text/image), read, createTime }`

### group_buys
`{ title, description, images[], unitPrice, targetCount, currentCount, participants[], status(recruiting/success/failed), creatorOpenid, deadline, createTime }`

### agent_buys
`{ description, budget, commission, status(open/accepted/completed/cancelled), requesterOpenid, agentOpenid, createTime }`

## 开发工作流
1. 新功能先在 `feature/*` 分支开发
2. 云函数改动后需右键"上传并部署"才能生效
3. 前端改动可在微信开发者工具中实时预览
4. 每完成一项功能，更新 `TODO.md` 中对应任务状态

## 重要约束
- 不要使用 npm 包，优先使用微信原生 API 和云开发能力
- 不要引入第三方 CSS 框架，使用 app.wxss 中的工具类 + WeUI
- 不要在前端硬编码云环境 ID，统一在 app.js 的 `wx.cloud.init` 中配置
- tabBar 页面不能使用 `wx.navigateTo` 跳转，必须用 `wx.switchTab`
- 云函数中不要返回 openid 给前端（安全考虑），仅在需要时返回脱敏的用户信息
- 图片上传走 `utils/api.js` 的 `uploadImage()`，云路径格式：`{目录}/{时间戳}-{随机串}.{扩展名}`

## 任务追踪
完整开发任务清单在 `TODO.md`，共6个阶段89项任务。
每次完成任务后应更新该文件中对应条目的状态标记。
