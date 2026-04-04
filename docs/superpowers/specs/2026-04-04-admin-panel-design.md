# X-Loop 后台管理系统设计文档

> Date: 2026-04-04
> Status: Draft

---

## 1. 概述

X-Loop 后台管理系统是一个独立的 Web 应用，用于平台日常运营管理。支持内容审核、用户管理、订单纠纷处理和数据分析，预留完整的角色权限体系以支持未来运营团队扩展。

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────┐     ┌──────────────────────┐
│   X-Loop 小程序      │     │   Admin Web (Vue 3)   │
│   (用户端)           │     │   Element Plus UI     │
└────────┬────────────┘     └────────┬─────────────┘
         │ wx.cloud.callFunction      │ HTTP API (云函数 HTTP 触发)
         │                            │
┌────────▼────────────────────────────▼─────────────┐
│              微信云开发                             │
│  ┌───────────────────────────────────────────┐    │
│  │  云函数层                                   │    │
│  │  ├── 现有函数 (product-*, user-login)       │    │
│  │  ├── admin-login    (管理员鉴权)             │    │
│  │  ├── admin-users    (用户管理)               │    │
│  │  ├── admin-products (商品审核/管理)           │    │
│  │  ├── admin-orders   (订单/纠纷管理)          │    │
│  │  ├── admin-reports  (举报处理)               │    │
│  │  └── admin-stats    (数据统计)               │    │
│  └───────────────────────────────────────────┘    │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐   │
│  │  云数据库     │  │ 云存储    │  │ 静态网站托管│   │
│  │  (共用)       │  │ (共用)    │  │ (Admin前端) │   │
│  └─────────────┘  └──────────┘  └────────────┘   │
└───────────────────────────────────────────────────┘
```

### 2.2 关键设计决策

- Admin Web 前端部署在微信云开发静态网站托管，零额外成本
- 所有 `admin-*` 云函数通过 HTTP 触发器暴露为 REST API
- 管理端和小程序端共享同一云数据库，云函数层做权限隔离
- 管理员鉴权走 JWT token（非微信 openid），与小程序用户体系独立
- 超级管理员初始账号通过云数据库手动插入，不提供注册入口

### 2.3 鉴权流程

```
Admin 登录页 ──POST username+password──> admin-login 云函数
                                           │
                                           ├── 查 admins 集合验证密码 (bcrypt)
                                           ├── 检查 status === 'active'
                                           └── 签发 JWT (payload: username, role, exp: 24h)
                                           │
Admin 前端 <───────── 返回 token ───────────┘
    │
    │ 后续请求：Header Authorization: Bearer <token>
    │
admin-* 云函数 ──> 校验 JWT ──> 检查角色权限 ──> 执行业务逻辑
```

## 3. 角色权限体系

### 3.1 角色定义

| 角色 | 标识 | 权限范围 |
|------|------|---------|
| 超级管理员 | `super_admin` | 全部权限 + 管理员账号管理 |
| 内容审核员 | `content_moderator` | 商品审核、举报处理、用户封禁 |
| 客服 | `customer_service` | 订单查看、纠纷介入、用户查询 |
| 数据分析师 | `data_analyst` | 只读访问数据看板和统计报表 |

### 3.2 权限矩阵

| 功能模块 | super_admin | content_moderator | customer_service | data_analyst |
|---------|:-----------:|:-----------------:|:----------------:|:------------:|
| 数据看板 | ✅ | ✅ | ✅ | ✅ |
| 用户列表/详情 | ✅ | ✅ | ✅ (只读) | ❌ |
| 用户封禁/解封 | ✅ | ✅ | ❌ | ❌ |
| 信誉分调整 | ✅ | ✅ | ❌ | ❌ |
| 商品列表/详情 | ✅ | ✅ | ✅ (只读) | ❌ |
| 商品下架/删除 | ✅ | ✅ | ❌ | ❌ |
| 举报处理 | ✅ | ✅ | ❌ | ❌ |
| 订单列表/详情 | ✅ | ❌ | ✅ | ❌ |
| 纠纷介入/裁决 | ✅ | ❌ | ✅ | ❌ |
| 管理员管理 | ✅ | ❌ | ❌ | ❌ |
| 操作日志 | ✅ | ❌ | ❌ | ❌ |
| 分类管理 | ✅ | ❌ | ❌ | ❌ |

## 4. 数据库设计

### 4.1 新增集合

#### admins（管理员）

| 字段 | 类型 | 说明 |
|------|------|------|
| username | string | 登录用户名，唯一 |
| passwordHash | string | bcrypt 加密密码 |
| role | string | super_admin / content_moderator / customer_service / data_analyst |
| displayName | string | 显示名称 |
| status | string | active / disabled |
| lastLoginTime | serverDate | 最后登录时间 |
| createTime | serverDate | 创建时间 |

#### reports（举报记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| targetType | string | product / user / message |
| targetId | string | 被举报对象 ID |
| reporterOpenid | string | 举报人 openid |
| reason | string | 举报原因分类（spam / fraud / prohibited / inappropriate / other） |
| description | string | 补充说明 |
| evidence | array[string] | 证据截图 fileID 列表 |
| status | string | pending / processing / resolved / rejected |
| handleResult | string | 处理结果说明 |
| handlerUsername | string | 处理人用户名 |
| createTime | serverDate | 创建时间 |
| handleTime | serverDate | 处理时间 |

#### admin_logs（审计日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| username | string | 操作人用户名 |
| action | string | 操作类型（ban_user / unban_user / remove_product / resolve_report / adjust_credit / force_refund / ...） |
| targetType | string | user / product / order / report |
| targetId | string | 操作对象 ID |
| detail | object | 操作详情（变更前后的值等） |
| createTime | serverDate | 操作时间 |

### 4.2 现有集合新增字段

#### users 新增

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | active / banned，默认 active |
| banReason | string | 封禁原因 |
| banTime | serverDate | 封禁时间 |

#### products 新增

| 字段 | 类型 | 说明 |
|------|------|------|
| reportCount | number | 被举报次数，默认 0 |
| adminNote | string | 管理员备注 |

#### orders 新增

| 字段 | 类型 | 说明 |
|------|------|------|
| disputeStatus | string | none / open / resolved，默认 none |
| disputeNote | string | 纠纷处理说明 |
| handlerUsername | string | 处理人用户名 |

## 5. 云函数设计

### 5.1 admin-login

- **触发方式**: HTTP POST
- **入参**: `{ username, password }`
- **逻辑**: 查 admins 集合 → bcrypt 验证密码 → 检查 status === 'active' → 签发 JWT（payload: username, role, exp 24h）
- **出参**: `{ code: 0, data: { token, role, displayName } }`
- **依赖**: jsonwebtoken, bcryptjs

### 5.2 admin-users

- **触发方式**: HTTP，需 JWT 鉴权
- **接口**:
  - `GET /list` — 用户列表（分页、搜索、筛选）
  - `GET /detail?openid=xxx` — 用户详情（含商品、订单、举报记录）
  - `POST /ban` — 封禁用户（需 content_moderator+）
  - `POST /unban` — 解封用户（需 content_moderator+）
  - `POST /adjust-credit` — 调整信誉分（需 content_moderator+）
- 所有写操作记录 admin_logs

### 5.3 admin-products

- **触发方式**: HTTP，需 JWT 鉴权
- **接口**:
  - `GET /list` — 商品列表（分页、搜索、筛选分类/状态、排序）
  - `GET /detail?id=xxx` — 商品详情
  - `POST /remove` — 强制下架（需 content_moderator+）
  - `POST /restore` — 恢复上架（需 content_moderator+）
  - `POST /batch-remove` — 批量下架（需 content_moderator+）
- 下架时更新 product status 为 `off_shelf`，写 adminNote

### 5.4 admin-orders

- **触发方式**: HTTP，需 JWT 鉴权
- **接口**:
  - `GET /list` — 订单列表（分页、搜索、筛选状态/纠纷）
  - `GET /detail?id=xxx` — 订单详情（含买卖双方信息、聊天记录）
  - `POST /intervene` — 标记纠纷（需 customer_service+）
  - `POST /resolve` — 裁决纠纷（强制退款/强制完成，需 customer_service+）

### 5.5 admin-reports

- **触发方式**: HTTP，需 JWT 鉴权
- **接口**:
  - `GET /list` — 举报列表（按状态分 tab，分页）
  - `GET /detail?id=xxx` — 举报详情（含被举报对象信息、聚合同对象举报）
  - `POST /claim` — 认领举报（需 content_moderator+）
  - `POST /resolve` — 处理举报（下架/封禁/驳回，需 content_moderator+）

### 5.6 admin-stats

- **触发方式**: HTTP，需 JWT 鉴权（所有角色可访问）
- **接口**:
  - `GET /overview` — 统计卡片数据（今日新增用户、商品、订单、待处理数）
  - `GET /trend?type=users&days=7` — 趋势数据（用户增长、交易量）
  - `GET /distribution` — 分布数据（商品分类热度）

### 5.7 公共中间件（复用模块）

```javascript
// cloudfunctions/admin-common/auth.js
// 统一 JWT 校验 + 角色权限检查
function verifyAdmin(token, requiredRoles) {
  // 1. 验证 JWT 签名和过期时间
  // 2. 从 payload 取 username, role
  // 3. 检查 role 是否在 requiredRoles 中
  // 4. 返回 { username, role } 或抛错
}

// cloudfunctions/admin-common/logger.js
// 统一审计日志写入
function logAction(username, action, targetType, targetId, detail) {
  // 写入 admin_logs 集合
}
```

## 6. 前端设计

### 6.1 技术栈

| 技术 | 用途 |
|------|------|
| Vue 3 + Composition API | 框架 |
| Element Plus | UI 组件库 |
| Vue Router | 路由 + 路由守卫权限拦截 |
| Pinia | 状态管理（登录态、权限） |
| ECharts | 数据看板图表 |
| Vite | 构建工具 |
| Axios | HTTP 请求 |

### 6.2 页面结构

```
admin-web/
├── src/
│   ├── views/
│   │   ├── login/            # 登录页
│   │   ├── dashboard/        # 数据看板（首页）
│   │   ├── users/            # 用户管理
│   │   │   ├── UserList.vue
│   │   │   └── UserDetail.vue
│   │   ├── products/         # 商品管理
│   │   │   ├── ProductList.vue
│   │   │   └── ProductDetail.vue
│   │   ├── reports/          # 举报处理
│   │   │   ├── ReportList.vue
│   │   │   └── ReportDetail.vue
│   │   ├── orders/           # 订单管理
│   │   │   ├── OrderList.vue
│   │   │   └── OrderDetail.vue
│   │   └── system/           # 系统管理
│   │       ├── AdminList.vue
│   │       ├── AdminLogs.vue
│   │       └── Categories.vue
│   ├── components/
│   │   ├── layout/           # 侧边栏 + 顶栏布局
│   │   ├── StatCard.vue      # 统计卡片
│   │   └── ConfirmDialog.vue # 操作确认弹窗（需填写原因）
│   ├── router/               # 路由配置 + 权限守卫
│   ├── stores/               # Pinia stores (auth, app)
│   ├── api/                  # API 请求封装
│   ├── utils/                # 工具函数
│   └── App.vue
├── package.json
└── vite.config.js
```

### 6.3 布局

标准管理后台布局：
- **左侧**：可折叠侧边栏导航，根据角色动态显示菜单项
- **顶部**：面包屑 + 当前用户信息 + 退出
- **主体**：内容区域

### 6.4 路由权限

```javascript
// 路由守卫逻辑
beforeEach:
  1. 无 token → 跳转登录页
  2. 有 token → 检查 token 是否过期
  3. 检查当前路由所需角色 vs 用户角色
  4. 无权限 → 跳转 403 页面
```

## 7. 项目目录结构

```
X-loop/
├── miniprogram/              # 现有小程序前端（不变）
├── cloudfunctions/           # 现有 + 新增云函数
│   ├── product-create/       # 现有
│   ├── product-list/         # 现有
│   ├── product-detail/       # 现有
│   ├── product-search/       # 现有
│   ├── product-update/       # 现有
│   ├── user-login/           # 现有
│   ├── admin-common/         # 新增：公共鉴权和日志模块
│   ├── admin-login/          # 新增
│   ├── admin-users/          # 新增
│   ├── admin-products/       # 新增
│   ├── admin-orders/         # 新增
│   ├── admin-reports/        # 新增
│   └── admin-stats/          # 新增
├── admin-web/                # 新增：管理后台前端
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── ...
```

## 8. 部署方案

1. **Admin 前端**: `vite build` → 产物上传至微信云开发静态网站托管
2. **Admin 云函数**: 微信开发者工具右键「上传并部署」，开启 HTTP 触发器
3. **JWT 密钥**: 存储在云函数环境变量中，不硬编码
4. **初始管理员**: 手动在云数据库 admins 集合插入一条 super_admin 记录

## 9. 安全措施

- 密码使用 bcrypt 加密存储，不存明文
- JWT 密钥通过云函数环境变量注入
- 所有管理操作记录审计日志
- 云函数 HTTP 触发器配置 CORS 白名单（仅允许管理后台域名）
- 封禁用户后，小程序端云函数需检查 user.status，拒绝 banned 用户的写操作
- 敏感操作（封禁、下架、裁决）需二次确认并填写原因
