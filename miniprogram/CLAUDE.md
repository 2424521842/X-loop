# 小程序前端开发指南

## 新建页面步骤
1. 在 `pages/` 下创建文件夹（kebab-case 命名）
2. 创建四个文件：`.wxml` `.wxss` `.js` `.json`
3. 在 `app.json` 的 `pages` 数组中注册页面路径
4. 如果是 tabBar 页面，还需在 `app.json` 的 `tabBar.list` 中添加

## 页面 JS 模板
```javascript
const { callCloud } = require('../../utils/api')
const { formatTime, CATEGORIES } = require('../../utils/util')

Page({
  data: {
    // 页面数据
  },
  onLoad(options) {
    // 页面加载
  },
  onShow() {
    // 页面显示
  }
})
```

## 新建组件步骤
1. 在 `components/` 下创建文件夹
2. 创建四个文件，`.json` 中设置 `"component": true`
3. 在需要使用的页面 `.json` 中通过 `usingComponents` 引入

## 已有通用样式（app.wxss）
布局：`flex-row` `flex-col` `flex-between` `flex-center` `flex-wrap` `flex-1`
文字：`text-primary` `text-gray` `text-small` `text-large` `text-bold` `text-ellipsis`
组件：`card` `btn-primary` `price` `tag` `tag-green` `tag-gray` `tag-red` `container`

## 已有工具函数（utils/）
- `callCloud(name, data, showLoading)` — 调用云函数，自动处理 loading 和错误
- `uploadImage(filePath, cloudDir)` — 上传图片到云存储，返回 fileID
- `getTempFileURL(fileList)` — 批量获取云文件临时链接
- `formatTime(date)` — 智能时间格式化（刚刚/N分钟前/N天前/日期）
- `formatPrice(price)` — 价格格式化为两位小数
- `CATEGORIES` — 商品分类数组 `[{id, name}]`
- `PRODUCT_STATUS` / `PRODUCT_STATUS_TEXT` — 商品状态常量与中文映射
