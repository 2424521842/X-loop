# X-Loop Web

X-Loop 网页版 Phase 3 前端骨架，技术栈为 Vue 3 + Vite 5 + Element Plus + Pinia + vue-router 4 + axios。

## 本阶段范围

- 登录流程：XJTLU 邮箱验证码登录。
- 路由守卫：受保护页面需要 JWT，首次登录必须补完校区。
- 基础布局：顶部品牌 header、用户菜单、页面容器。
- 样式系统：复用小程序品牌色与工具类。
- 业务页面：保留 placeholder，Phase 4 再实现。

## 本地运行

```bash
npm install
npm run dev
```

开发环境默认把 `/api` 代理到 `http://localhost:3000`。如果部署到独立后端域名，可在 `.env` 中设置 `VITE_API_BASE`。

## 环境变量

```bash
VITE_API_BASE=/api
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Cloudinary 字段在 Phase 4 发布商品上传图片时使用。
