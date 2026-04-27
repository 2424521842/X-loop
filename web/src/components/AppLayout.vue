<template>
  <div class="app-shell" :class="{ 'has-tabbar': showTabbar }">
    <header
      v-if="showTopbar"
      class="mobile-nav"
      :class="{ 'mobile-nav-tab': isTabPage }"
    >
      <template v-if="isTabPage">
        <RouterLink class="nav-brand" to="/" aria-label="X-Loop 首页">
          <span class="nav-wordmark">{{ tabTitle }}</span>
        </RouterLink>

        <RouterLink
          v-if="userStore.isLoggedIn && userStore.user"
          class="nav-user"
          to="/profile"
          aria-label="个人中心"
        >
          <el-avatar :size="28" :src="userStore.user.avatarUrl">
            {{ avatarText }}
          </el-avatar>
        </RouterLink>
        <RouterLink v-else class="nav-login" to="/login">登录</RouterLink>
      </template>

      <template v-else>
        <button class="nav-back" type="button" aria-label="返回" @click="goBack">
          <span aria-hidden="true">‹</span>
        </button>
        <h1 class="nav-title">{{ navTitle }}</h1>
        <span class="nav-spacer" aria-hidden="true"></span>
      </template>
    </header>

    <main class="app-main" :class="{ 'app-main-tab': showTabbar, 'app-main-no-top': !showTopbar }">
      <RouterView />
    </main>

    <nav v-if="showTabbar" class="mobile-tabbar" aria-label="主导航">
      <RouterLink
        v-for="item in tabItems"
        :key="item.path"
        class="tab-item"
        :class="{ active: isTabActive(item) }"
        :to="item.path"
      >
        <img
          class="tab-icon"
          :src="isTabActive(item) ? item.activeIcon : item.icon"
          :alt="item.label"
        >
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import tabHome from '../assets/mobile/tab-home-v2.png'
import tabHomeActive from '../assets/mobile/tab-home-active-v2.png'
import tabProfile from '../assets/mobile/tab-profile-v2.png'
import tabProfileActive from '../assets/mobile/tab-profile-active-v2.png'
import tabPublish from '../assets/mobile/tab-publish-v2.png'
import tabPublishActive from '../assets/mobile/tab-publish-active-v2.png'
import tabMessage from '../assets/mobile/tab-message-v2.png'
import tabMessageActive from '../assets/mobile/tab-message-active-v2.png'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const tabItems = [
  { path: '/', name: 'home', label: '首页', icon: tabHome, activeIcon: tabHomeActive },
  { path: '/publish', name: 'publish', label: '发布', icon: tabPublish, activeIcon: tabPublishActive },
  { path: '/chat-list', name: 'chat-list', label: '消息', icon: tabMessage, activeIcon: tabMessageActive },
  { path: '/profile', name: 'profile', label: '我的', icon: tabProfile, activeIcon: tabProfileActive }
]

const displayName = computed(() => {
  return userStore.user?.nickName || userStore.user?.email || 'X-Loop 用户'
})

const avatarText = computed(() => {
  return displayName.value.slice(0, 1).toUpperCase()
})

const isTabPage = computed(() => tabItems.some((item) => item.name === route.name))
const showTabbar = computed(() => isTabPage.value)
const showTopbar = computed(() => route.meta?.hideShellTopbar !== true)
const navTitle = computed(() => route.meta?.title || 'X-Loop')
const tabTitle = computed(() => {
  if (route.name === 'publish') return '发布商品'
  if (route.name === 'chat-list') return '消息'
  if (route.name === 'profile') return '个人中心'
  return 'X-Loop'
})

function isTabActive(item) {
  return route.name === item.name
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/')
}
</script>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
  background: var(--color-bg);
}

.mobile-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--mobile-nav-height);
  padding: 0 max(18px, env(safe-area-inset-left)) 0 max(18px, env(safe-area-inset-left));
  background: var(--gradient-brand);
  box-shadow: 0 4px 18px rgba(1, 5, 68, 0.12);
  color: #fff;
}

.mobile-nav-tab {
  padding-right: max(18px, env(safe-area-inset-right));
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  color: #fff;
}

.nav-wordmark {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 2px;
}

.nav-user {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}

.nav-login {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.nav-back,
.nav-spacer {
  width: 44px;
  height: 44px;
}

.nav-back {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.nav-back span {
  font-size: 36px;
  font-weight: 300;
  line-height: 1;
}

.nav-title {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-main {
  min-height: calc(100vh - var(--mobile-nav-height));
}

.app-main-no-top {
  min-height: 100vh;
}

.app-main-tab {
  padding-bottom: calc(var(--mobile-tabbar-height) + env(safe-area-inset-bottom));
}

.mobile-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 110;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  min-height: calc(var(--mobile-tabbar-height) + env(safe-area-inset-bottom));
  padding: 7px max(8px, env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
  border-top: 1px solid rgba(1, 5, 68, 0.08);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 -4px 18px rgba(1, 5, 68, 0.08);
}

.tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  color: #999;
  font-size: 11px;
  font-weight: 700;
}

.tab-item.active {
  color: var(--color-primary);
}

.tab-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

@media (min-width: 768px) {
  .mobile-nav,
  .mobile-tabbar {
    right: calc((100vw - min(100vw, var(--mobile-shell-max))) / 2);
    left: calc((100vw - min(100vw, var(--mobile-shell-max))) / 2);
    width: min(100vw, var(--mobile-shell-max));
    margin: 0 auto;
  }

  .app-shell {
    background:
      linear-gradient(90deg, rgba(1, 5, 68, 0.04) 0, transparent 18%, transparent 82%, rgba(206, 87, 193, 0.05) 100%),
      var(--color-bg);
  }
}

@media (max-width: 600px) {
  .mobile-nav {
    position: sticky;
  }
}
</style>
