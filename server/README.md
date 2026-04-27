# X-Loop Server

X-Loop 网页版后端，提供 XJTLU 邮箱验证码登录、JWT 鉴权、商品、订单、评价、站内消息和 Cloudinary 上传配置接口。

## Dependencies

运行依赖：`express`、`mongoose`、`dotenv`、`jsonwebtoken`、`bcryptjs`、`cors`、`express-rate-limit`。

开发依赖：`nodemon`、`vitest`、`supertest`、`mongodb-memory-server`。

## Environment

复制 `.env.example` 为 `.env`，按部署环境填写：

- `PORT`: 服务端口，默认 `3000`
- `MONGODB_URI`: MongoDB 连接串
- `JWT_SECRET`: JWT 签名密钥，建议 32 位以上随机字符串
- `SES_SECRET_ID`: 腾讯云 API SecretId
- `SES_SECRET_KEY`: 腾讯云 API SecretKey
- `SES_REGION`: 腾讯云 SES 区域，例如 `ap-guangzhou`
- `SES_ENDPOINT`: 腾讯云 SES endpoint，例如 `ses.tencentcloudapi.com`
- `SES_SENDER`: 发件地址
- `SES_TEMPLATE_ID`: SES 邮件模板 ID
- `SES_SUBJECT`: 邮件标题
- `SES_REPLY_TO`: 回复地址
- `EMAIL_DEV_MODE`: `true` 时跳过真实发送并在控制台打印验证码
- `EMAIL_CODE_SALT`: 验证码哈希盐值
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_UPLOAD_PRESET`: Cloudinary unsigned upload preset 名称

## Commands

```bash
npm install
npm run dev
npm test
npm run seed
```

生产启动：

```bash
npm start
```

## API

所有接口统一返回 `{ code, message, data }`。

### Auth / Users

- `POST /api/auth/email-code`: 发送邮箱验证码
- `POST /api/auth/verify`: 校验验证码并返回 JWT
- `GET /api/auth/me`: 获取当前登录用户
- `PATCH /api/users/me`: 更新当前用户资料
- `GET /api/users/:id`: 获取用户公开资料

### Products

- `GET /api/products?category=&status=&page=0&pageSize=20`: 商品列表，默认 `status=on_sale`
- `GET /api/products/search?q=`: 搜索标题和描述
- `GET /api/products/mine`: 当前用户发布的商品，需登录
- `GET /api/products/:id`: 商品详情并增加浏览量
- `POST /api/products`: 发布商品，需登录
- `PATCH /api/products/:id`: 修改本人商品，需登录

### Orders

- `POST /api/orders`: 下单，需登录
- `GET /api/orders?role=buyer|seller&status=`: 买家或卖家订单列表，需登录
- `PATCH /api/orders/:id`: 订单状态流转，需登录

### Reviews

- `POST /api/reviews`: 为已完成订单评价，需登录
- `GET /api/reviews/user/:id`: 查看某用户收到的评价

### Messages

- `POST /api/messages`: 发送站内消息，需登录
- `GET /api/messages/conversations`: 会话列表，需登录
- `GET /api/messages/:userId?since=<msgId>`: 拉取一对一会话，需登录

### Upload

- `POST /api/upload/sign`: 返回 Cloudinary unsigned upload 配置，需登录

## Cloudinary Setup

1. 登录 Cloudinary Dashboard，进入 `Settings` → `Upload`。
2. 新建一个 unsigned upload preset，建议限制为图片类型并设置合理大小上限。
3. 将 cloud name 写入 `CLOUDINARY_CLOUD_NAME`，将 preset 名称写入 `CLOUDINARY_UPLOAD_PRESET`。
4. 前端拿到 `/api/upload/sign` 返回的 `cloudName`、`uploadPreset`、`folder` 后，直接上传到 Cloudinary unsigned upload endpoint；后端只保存图片 URL。

## Notes

`EMAIL_DEV_MODE=true` 只适合本地开发和自动化测试。线上环境必须配置腾讯云 SES 相关字段，并设置 `EMAIL_DEV_MODE=false`。
