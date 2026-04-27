import { createRouter, createWebHistory } from 'vue-router'
import { hasMenu } from '../utils/permission'

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
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/DashboardView.vue'), meta: { menu: 'dashboard', title: '数据看板' } },
      { path: 'users', name: 'UserList', component: () => import('../views/users/UserList.vue'), meta: { menu: 'users', title: '用户管理' } },
      { path: 'users/:id', name: 'UserDetail', component: () => import('../views/users/UserDetail.vue'), meta: { menu: 'users', title: '用户详情' } },
      { path: 'products', name: 'ProductList', component: () => import('../views/products/ProductList.vue'), meta: { menu: 'products', title: '商品管理' } },
      { path: 'products/:id', name: 'ProductDetail', component: () => import('../views/products/ProductDetail.vue'), meta: { menu: 'products', title: '商品详情' } },
      { path: 'reports', name: 'ReportList', component: () => import('../views/reports/ReportList.vue'), meta: { menu: 'reports', title: '举报处理' } },
      { path: 'reports/:id', name: 'ReportDetail', component: () => import('../views/reports/ReportDetail.vue'), meta: { menu: 'reports', title: '举报详情' } },
      { path: 'orders', name: 'OrderList', component: () => import('../views/orders/OrderList.vue'), meta: { menu: 'orders', title: '订单管理' } },
      { path: 'orders/:id', name: 'OrderDetail', component: () => import('../views/orders/OrderDetail.vue'), meta: { menu: 'orders', title: '订单详情' } },
      { path: 'system/admins', name: 'AdminList', component: () => import('../views/system/AdminList.vue'), meta: { menu: 'system', title: '管理员管理' } },
      { path: 'system/logs', name: 'AdminLogs', component: () => import('../views/system/AdminLogs.vue'), meta: { menu: 'system', title: '操作日志' } },
      { path: 'system/categories', name: 'Categories', component: () => import('../views/system/Categories.vue'), meta: { menu: 'system', title: '分类管理' } }
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
