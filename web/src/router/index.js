import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const Placeholder = () => import('../pages/Placeholder.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/Home.vue'),
    meta: { public: true, title: '首页' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/Login.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../pages/Search.vue'),
    meta: { public: true, title: '搜索' }
  },
  {
    path: '/product/:id',
    name: 'product-detail',
    component: () => import('../pages/ProductDetail.vue'),
    meta: { public: true, title: '商品详情' }
  },
  {
    path: '/reviews/:userId',
    name: 'reviews',
    component: () => import('../pages/Reviews.vue'),
    meta: { requiresAuth: true, title: '评价' }
  },
  {
    path: '/publish',
    name: 'publish',
    component: () => import('../pages/Publish.vue'),
    meta: { requiresAuth: true, title: '发布商品' }
  },
  {
    path: '/my-products',
    name: 'my-products',
    component: () => import('../pages/MyProducts.vue'),
    meta: { requiresAuth: true, title: '我的发布' }
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('../pages/Orders.vue'),
    meta: { requiresAuth: true, title: '订单' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/Profile.vue'),
    meta: { requiresAuth: true, title: '个人中心' }
  },
  {
    path: '/profile/edit',
    name: 'profile-edit',
    component: () => import('../pages/ProfileEdit.vue'),
    meta: { requiresAuth: true, title: '编辑资料' }
  },
  {
    path: '/chat-list',
    name: 'chat-list',
    component: () => import('../pages/ChatList.vue'),
    meta: { requiresAuth: true, title: '消息' }
  },
  {
    path: '/chat/:userId',
    name: 'chat',
    component: () => import('../pages/Chat.vue'),
    meta: { requiresAuth: true, title: '聊天', hideShellTopbar: true }
  },
  {
    path: '/admin/:pathMatch(.*)*',
    name: 'admin',
    component: Placeholder,
    meta: { title: '管理后台' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: Placeholder,
    meta: { title: '未实现页面' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  if (!userStore.ready) {
    await userStore.boot()
  }

  const hasToken = Boolean(userStore.token)
  if (to.meta.requiresAuth && !hasToken) {
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  if (
    hasToken
    && userStore.user
    && !userStore.user.campus
    && to.path !== '/profile/edit'
    && to.path !== '/login'
  ) {
    return {
      path: '/profile/edit',
      query: { force: '1' }
    }
  }

  return true
})

export default router
