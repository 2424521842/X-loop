# 云函数开发指南

## 新建云函数步骤
1. 在 `cloudfunctions/` 下创建文件夹（kebab-case 命名）
2. 创建 `index.js` 和 `package.json`
3. 在微信开发者工具中右键文件夹 → "上传并部署：云端安装依赖"

## 云函数模板
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 业务逻辑
    return { code: 0, message: 'success', data: result }
  } catch (err) {
    return { code: -1, message: err.message, data: null }
  }
}
```

## package.json 模板
```json
{
  "name": "函数名",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

## 关键规则
- 返回格式统一：`{ code, message, data }`
- 写操作必须校验 openid 归属权（防止用户篡改他人数据）
- 时间字段使用 `db.serverDate()` 而非 JS Date
- 分页查询使用 `.skip(page * pageSize).limit(pageSize)`
- 模糊搜索使用 `db.RegExp({ regexp: keyword, options: 'i' })`
- 自增操作使用 `db.command.inc(1)` 而非先读后写
- 不要在返回数据中暴露用户 openid，只返回昵称、头像等脱敏信息

## 已有云函数
| 函数名 | 功能 | 关键参数 |
|--------|------|----------|
| user-login | 登录/注册 | 无（自动获取 openid） |
| product-create | 发布商品 | title, description, price, category, images |
| product-list | 商品列表 | category, page, pageSize |
| product-detail | 商品详情 | id |
| product-update | 更新商品 | id, data |
| product-search | 搜索商品 | keyword, sortBy, page, pageSize |
