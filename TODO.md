# X-Loop Development Task Checklist

> Last updated: 2026-04-27 (web pivot in progress — see Web Pivot section below)
> Status: ✅ Done | 🔄 In Progress | ⬜ To Do

---

## Direction Update: Web MVP Pivot

- ✅ Pivot public-facing client from WeChat Mini Program launch path to a web MVP.
- ✅ Adjust trading model to buyer-seller contact + offline handover + order status tracking.
- ✅ Scaffold static web prototype in `web/` without online payment or fund custody.

### Web Pivot Progress (Express + Vue 3)

- ✅ Phase 4a: Login / Home / Profile / Publish / ProductDetail core pages
- ✅ Phase 4b-1: Orders (买/卖 tabs + 状态流转) + Reviews (评分 + 列表 + 平均分)
- ✅ Phase 4b-2: ChatList (5s 轮询) + Chat (3s 增量轮询 + 乐观 UI)
- ✅ Phase 4b-3: Search 页（URL 驱动 + localStorage 历史 + 竞态保护）
- ⬜ Phase 5: admin-web 迁移到新栈 + 部署（Vercel + Render + Atlas + Cloudinary）
- ⬜ Phase 6: 端到端验收

---

## Phase 1: Project Kickoff & Requirements (Week 1-2)

### 1.1 Team & Tools
- ⬜ Define team roles for 7 members (PM / UI / Frontend×2 / Backend×2 / QA)
- ⬜ Set up collaboration tools (GitHub repo / Lark or WeCom group)
- ⬜ Establish Git branching strategy (main → dev → feature/*)

### 1.2 Requirements Documentation
- ⬜ Write Market Requirements Document (MRD)
- ⬜ Write User Stories
- ⬜ Prioritize features using MoSCoW method

---

## Phase 2: Design & Technical Setup (Week 3-4)

### 2.1 UI/UX Design
- ⬜ Create Figma project with design system (colors / fonts / components)
- ⬜ Design homepage prototype
- ⬜ Design product detail page prototype
- ⬜ Design publish product page prototype
- ⬜ Design search/filter page prototype
- ⬜ Design profile page prototype
- ⬜ Design chat page prototype
- ⬜ Design group buy / purchasing agent section prototype
- ✅ Create tabBar icons (Home / Publish / Profile, normal + active states)

### 2.2 Technical Setup
- ✅ Register WeChat Mini Program account, obtain AppID
- ✅ Enable WeChat Cloud Development, obtain environment ID
- ✅ Configure AppID in `project.config.json`
- ✅ Configure cloud environment ID in `app.js`
- ✅ Install WeChat DevTools for all team members
- ✅ Create GitHub repository and push initial code

### 2.3 Database
- ✅ Create cloud database collection: `users`
- ✅ Create cloud database collection: `products`
- ✅ Create cloud database collection: `orders`
- ✅ Create cloud database collection: `reviews`
- ✅ Create cloud database collection: `categories`
- ✅ Create cloud database collection: `messages`
- ✅ Create cloud database collection: `group_buys`
- ✅ Create cloud database collection: `agent_buys`
- ✅ Configure database permission rules
- ⬜ Write API documentation

### 2.4 Cloud Functions
- ✅ Implement cloud function `user-login`
- ✅ Implement cloud function `product-create`
- ✅ Implement cloud function `product-list`
- ✅ Implement cloud function `product-detail`
- ✅ Implement cloud function `product-update`
- ✅ Implement cloud function `product-search`
- ✅ Deploy all cloud functions to cloud

---

## Phase 3: MVP Development — Core Trading Features (Week 5-8)

### 3.1 Frontend Pages
- ✅ Homepage (product list + category tabs + pull-to-refresh + infinite scroll)
- ✅ Product detail page (image carousel + product info + seller info + bottom action bar)
- ✅ Publish product page (image upload + form + category picker + submit)
- ✅ Publish product campus selector (SIP / TC) and campus display
- ✅ Search page (search bar + sort/filter + search history + result list)
- ✅ Profile page (user info + stats + menu list)
- ✅ Global styles (app.wxss utility classes)
- ✅ Add tabBar icon assets (png)
- ✅ Add default avatar image `images/default-avatar.png`

### 3.2 Utility Modules
- ✅ `utils/api.js` (cloud function wrapper / image upload / temp URL fetcher)
- ✅ `utils/util.js` (time formatter / price formatter / category constants / status mapping)

### 3.3 Campus Verification
- ✅ Develop email verification page `pages/email-verify/`
- ✅ Develop campus selection page `pages/campus-select/`
- ✅ Implement cloud function `email-code-send`
- ✅ Implement cloud function `email-code-verify`
- ✅ Implement cloud function `user-profile-update`
- ✅ Create cloud database collection: `email_codes`

### 3.4 Integration Testing
- ✅ End-to-end: user login flow
- ✅ End-to-end: publish product → display on homepage
- ✅ End-to-end: product search
- ✅ End-to-end: view product detail
- ⬜ On-device testing (iOS + Android)
- ⬜ Fix bugs found during integration

---

## Phase 4: Feature Expansion (Week 9-12)

### 4.1 Chat
- ✅ Implement cloud function `message-send`
- ✅ Implement cloud function `message-list`
- ✅ Develop chat page `pages/chat/`
- ✅ Develop chat list page `pages/chat-list/`
- ✅ Implement real-time messaging via cloud database watch

### 4.2 Order System
- ✅ Implement cloud function `order-create`
- ✅ Implement cloud function `order-update`
- ✅ Implement cloud function `order-list`
- ✅ Develop order page `pages/order/`
- ✅ Implement order flow: place order → confirm → complete

### 4.3 Review System
- ✅ Implement cloud function `review-create`
- ✅ Implement cloud function `review-list`
- ✅ Develop review component `components/review/`
- ✅ Implement credit score calculation logic

### 4.4 Notifications
- ⬜ Configure WeChat subscription message templates
- ⬜ Implement new order notification
- ⬜ Implement new message notification

### 4.5 Group Buy
- ✅ Implement cloud function `group-buy-create`
- ✅ Implement cloud function `group-buy-join`
- ✅ Implement cloud function `group-buy-list`
- ✅ Develop group buy page `pages/group-buy/`
- ✅ Implement create group / join group / group success logic

### 4.6 Purchasing Agent
- ✅ Implement cloud function `agent-buy-create`
- ✅ Implement cloud function `agent-buy-accept`
- ✅ Implement cloud function `agent-buy-list`
- ✅ Develop purchasing agent page `pages/agent-buy/`
- ✅ Implement post request / accept order / commission settlement

### 4.7 Non-functional Requirements
- ✅ Anonymous browsing (no login required for browsing, triggered on order)
- ✅ Frontend image compression before upload
- ✅ Cloud database permission rules (users can only modify their own data)
- ✅ Integrate WeChat Content Security API (text + image moderation)

---

## Phase 4.5: Admin Management System

### 4.5.1 Cloud Functions — Backend
- ✅ Create `admin-common` shared auth (JWT) + audit logger module
- ✅ Create `admin-login` cloud function (username/password → JWT)
- ✅ Create `admin-users` cloud function (list/detail/ban/unban/adjust-credit)
- ✅ Create `admin-products` cloud function (list/detail/remove/restore/batch-remove)
- ✅ Create `admin-orders` cloud function (list/detail/intervene/resolve)
- ✅ Create `admin-reports` cloud function (list/detail/claim/resolve)
- ✅ Create `admin-stats` cloud function (overview/trend/distribution)
- ✅ Add banned user checks to existing cloud functions (user-login, product-create, product-update)

### 4.5.2 Database Setup
- ✅ Create `admins` collection
- ✅ Create `reports` collection
- ✅ Create `admin_logs` collection
- ✅ Seed initial super_admin account

### 4.5.3 Admin Web Frontend
- ✅ Scaffold admin-web project (Vue 3 + Element Plus + Vite)
- ✅ Implement login page + JWT auth store + route guards
- ✅ Implement layout components (sidebar + header + role-filtered menus)
- ✅ Implement dashboard page (stat cards + ECharts trend/distribution)
- ✅ Implement user management pages (list + detail + ban/unban/credit)
- ✅ Implement product management pages (list + detail + remove/restore/batch)
- ✅ Implement report management pages (list + detail + claim/resolve)
- ✅ Implement order management pages (list + detail + dispute handling)
- ✅ Implement system management pages (admin list, audit logs, categories)

### 4.5.4 Deployment
- ✅ Deploy admin cloud functions with HTTP triggers
- ✅ Build and deploy admin-web to WeChat Cloud static hosting
- ✅ Configure CORS and JWT secret in cloud environment variables
- ✅ End-to-end verification of admin panel

---

## Phase 5: Testing & Optimization (Week 13-14)

### 5.1 Testing
- ⬜ Functional testing: verify all feature points
- ⬜ Compatibility testing: iOS / Android across devices
- ⬜ Performance testing: cloud function response time
- ⬜ Security testing: permission rules / XSS protection
- ⬜ User Acceptance Testing (UAT): invite 10-20 XJTLU students
- ⬜ Collect user feedback and fix issues

### 5.2 Optimization
- ⬜ First-screen load optimization (mini program subpackage loading)
- ⬜ Image lazy loading optimization
- ⬜ Cloud function cold start optimization
- ⬜ Database index optimization (search performance)

---

## Phase 6: Launch & Operations (Week 15-16)

### 6.1 Launch Preparation
- ⬜ Write mini program privacy policy
- ⬜ Prepare review screenshots and description
- ⬜ Configure production cloud environment resources
- ⬜ Submit for WeChat Mini Program review
- ⬜ Publish after review approval

### 6.2 Campus Promotion
- ⬜ Create promotional materials (posters / flyers)
- ⬜ Campus official accounts / student club promotion
- ⬜ Seed user incentive program

### 6.3 Success Metrics Tracking
- ⬜ Set up user registration count tracking
- ⬜ Set up order completion rate tracking
- ⬜ Set up user engagement tracking (DAU/MAU)
- ⬜ Set up user review satisfaction tracking

---

## Progress Overview

| Phase | Total | Done | Progress |
|-------|-------|------|----------|
| Phase 1: Kickoff & Requirements | 6 | 0 | 0% |
| Phase 2: Design & Setup | 32 | 22 | 69% |
| Phase 3: MVP Development | 22 | 18 | 82% |
| Phase 4: Feature Expansion | 31 | 28 | 90% |
| Phase 4.5: Admin Management System | 25 | 25 | 100% |
| Phase 5: Testing & Optimization | 10 | 0 | 0% |
| Phase 6: Launch & Operations | 12 | 0 | 0% |
| **Total** | **138** | **93** | **67%** |
