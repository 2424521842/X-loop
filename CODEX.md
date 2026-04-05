# X-Loop Admin Panel Development Guide (for Codex)

## Project Overview

X-Loop is a WeChat Mini Program for second-hand trading among XJTLU students. You are building the **admin management web application** — a separate Vue 3 SPA that shares the same cloud database and cloud functions backend.

## Tech Stack

- **Mini Program**: Native WeChat (WXML + WXSS + JS) + WeChat Cloud Development
- **Admin Web** (building now): Vue 3 + Element Plus + Pinia + Vue Router + ECharts + Axios + Vite
- **Backend**: WeChat Cloud Functions (Node.js) with cloud database (NoSQL)

## Project Structure

```
X-loop/
├── miniprogram/           # Mini program frontend (DON'T modify unless told)
├── cloudfunctions/        # Cloud functions (add admin-* functions here)
│   ├── product-create/    # Existing
│   ├── product-list/      # Existing
│   ├── product-detail/    # Existing
│   ├── product-search/    # Existing
│   ├── product-update/    # Existing
│   ├── user-login/        # Existing
│   └── admin-*/           # NEW: admin cloud functions
├── admin-web/             # NEW: Admin web frontend (Vue 3)
├── CLAUDE.md              # Full project guide
└── TODO.md                # Task checklist
```

## Cloud Function Conventions

Every cloud function MUST follow these patterns:

### Response Format
```javascript
// Success
return { code: 0, message: 'success', data: { ... } }
// Error
return { code: -1, message: 'error description', data: null }
```

### Initialization
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
```

### Timestamps
```javascript
// ALWAYS use serverDate, NEVER use new Date()
createTime: db.serverDate()
updateTime: db.serverDate()
```

### Error Handling
```javascript
try {
  // business logic
  return { code: 0, message: 'success', data: result }
} catch (err) {
  return { code: -1, message: err.message, data: null }
}
```

### Naming
- File names: kebab-case (e.g., `admin-login`, `admin-users`)
- Variables/functions: camelCase
- Code comments: Chinese

### package.json Template
```json
{
  "name": "function-name",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```
Add `"jsonwebtoken": "^9.0.0"` and/or `"bcryptjs": "^2.4.3"` when needed.

## Admin Cloud Function Pattern

All admin cloud functions use action-based routing via a single entry point:

```javascript
exports.main = async (event) => {
  const { action, token, data: reqData } = event
  // 1. Verify JWT token
  // 2. Switch on action
  // 3. Return standard response
}
```

### JWT Auth Pattern
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'xloop-admin-secret-key-change-in-production'

function verifyToken(token, requiredPerm) {
  if (!token) throw new Error('未提供认证令牌')
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token
  const decoded = jwt.verify(actualToken, JWT_SECRET)
  // Check role permissions
  return decoded
}
```

### Audit Logging Pattern
```javascript
async function logAction(username, action, targetType, targetId, detail) {
  await db.collection('admin_logs').add({
    data: { username, action, targetType, targetId, detail, createTime: db.serverDate() }
  })
}
```

## Admin Web Conventions

- Use Element Plus components (ElTable, ElForm, ElDialog, ElMessage, etc.)
- API calls go through `src/api/request.js` using `callAdminApi(funcName, data)`
- Auth state managed by Pinia store at `src/stores/auth.js`
- Route permissions via `meta.menu` field matched against role-based menu access
- XJTLU brand colors: primary deep purple `#010544`, accent pink `#CE57C1`

## Key Documents

- **Design Spec**: `docs/superpowers/specs/2026-04-04-admin-panel-design.md`
- **Implementation Plan**: `docs/superpowers/plans/2026-04-05-admin-panel-plan.md`
- **Full Project Guide**: `CLAUDE.md`

## Do NOT

- Modify existing miniprogram/ files unless explicitly told to (Task 8 only)
- Use `new Date()` in cloud functions — use `db.serverDate()`
- Use npm packages beyond what's specified — no extra dependencies
- Hardcode cloud environment IDs
- Return openid to the frontend from cloud functions
- Add features not specified in the implementation plan
