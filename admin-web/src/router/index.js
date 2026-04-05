import { createRouter, createWebHistory } from 'vue-router'
import { hasMenu } from '../utils/permission'

const PlaceholderView = {
  template: '<div style="padding: 24px; background: #fff; border-radius: 12px; color: #666;">页面开发中</div>'
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: PlaceholderView, meta: { menu: 'dashboard', title: '数据看板' } },
      { path: 'users', name: 'UserList', component: PlaceholderView, meta: { menu: 'users', title: '用户管理' } },
      { path: 'users/:openid', name: 'UserDetail', component: PlaceholderView, meta: { menu: 'users', title: '用户详情' } },
      { path: 'products', name: 'ProductList', component: PlaceholderView, meta: { menu: 'products', title: '商品管理' } },
      { path: 'products/:id', name: 'ProductDetail', component: PlaceholderView, meta: { menu: 'products', title: '商品详情' } },
      { path: 'reports', name: 'ReportList', component: PlaceholderView, meta: { menu: 'reports', title: '举报处理' } },
      { path: 'reports/:id', name: 'ReportDetail', component: PlaceholderView, meta: { menu: 'reports', title: '举报详情' } },
      { path: 'orders', name: 'OrderList', component: PlaceholderView, meta: { menu: 'orders', title: '订单管理' } },
      { path: 'orders/:id', name: 'OrderDetail', component: PlaceholderView, meta: { menu: 'orders', title: '订单详情' } },
      { path: 'system/admins', name: 'AdminList', component: PlaceholderView, meta: { menu: 'system', title: '管理员管理' } },
      { path: 'system/logs', name: 'AdminLogs', component: PlaceholderView, meta: { menu: 'system', title: '操作日志' } },
      { path: 'system/categories', name: 'Categories', component: PlaceholderView, meta: { menu: 'system', title: '分类管理' } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  if (to.meta.public) return next()

  const token = localStorage.getItem('admin_token')
  if (!token) return next('/login')

  // 路由级权限检查：防止通过 URL 直接访问无权限页面
  const role = localStorage.getItem('admin_role')
  if (to.meta.menu && !hasMenu(role, to.meta.menu)) {
    return next('/dashboard')
  }
  next()
})

export default router
