import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const Placeholder = () => import('../pages/Placeholder.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/Home.vue'),
    meta: { public: true, titleKey: 'routes.home' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/Login.vue'),
    meta: { public: true, titleKey: 'routes.login' }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../pages/Search.vue'),
    meta: { public: true, titleKey: 'routes.search' }
  },
  {
    path: '/product/:id',
    name: 'product-detail',
    component: () => import('../pages/ProductDetail.vue'),
    meta: { public: true, titleKey: 'routes.productDetail' }
  },
  {
    path: '/reviews/:userId',
    name: 'reviews',
    component: () => import('../pages/Reviews.vue'),
    meta: { public: true, titleKey: 'routes.reviews' }
  },
  {
    path: '/publish',
    name: 'publish',
    component: () => import('../pages/Publish.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.publish' }
  },
  {
    path: '/my-products',
    name: 'my-products',
    component: () => import('../pages/MyProducts.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.myProducts' }
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('../pages/Orders.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.orders' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../pages/Profile.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.profile' }
  },
  {
    path: '/profile/edit',
    name: 'profile-edit',
    component: () => import('../pages/ProfileEdit.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.profileEdit' }
  },
  {
    path: '/chat-list',
    name: 'chat-list',
    component: () => import('../pages/ChatList.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.chatList' }
  },
  {
    path: '/chat/:userId',
    name: 'chat',
    component: () => import('../pages/Chat.vue'),
    meta: { requiresAuth: true, titleKey: 'routes.chat', hideShellTopbar: true }
  },
  {
    path: '/admin/:pathMatch(.*)*',
    name: 'admin',
    component: Placeholder,
    meta: { titleKey: 'routes.admin' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: Placeholder,
    meta: { titleKey: 'routes.notFound' }
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
  const isReviewWriteMode = to.name === 'reviews' && Boolean(to.query.orderId)
  if ((to.meta.requiresAuth || isReviewWriteMode) && !hasToken) {
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
    && !(to.name === 'reviews' && !to.query.orderId)
  ) {
    return {
      path: '/profile/edit',
      query: { force: '1' }
    }
  }

  return true
})

export default router
