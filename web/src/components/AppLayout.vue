<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="brand" to="/" aria-label="X-Loop 首页">
        <span class="brand-mark">X</span>
        <span class="brand-text">X-Loop</span>
      </RouterLink>

      <div class="header-actions">
        <template v-if="userStore.isLoggedIn && userStore.user">
          <el-dropdown trigger="click" @command="handleCommand">
            <button class="user-button" type="button">
              <el-avatar :size="32" :src="userStore.user.avatarUrl">
                {{ avatarText }}
              </el-avatar>
              <span class="nickname text-ellipsis">{{ displayName }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <RouterLink v-else class="login-link" to="/login">登录</RouterLink>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'

const router = useRouter()
const userStore = useUserStore()

const displayName = computed(() => {
  return userStore.user?.nickName || userStore.user?.email || 'X-Loop 用户'
})

const avatarText = computed(() => {
  return displayName.value.slice(0, 1).toUpperCase()
})

function handleCommand(command) {
  if (command === 'profile') {
    router.push('/profile')
    return
  }
  if (command === 'logout') {
    userStore.logout()
  }
}
</script>

<style scoped lang="scss">
.app-shell {
  min-height: 100vh;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: #fff;
  box-shadow: 0 2px 14px rgba(1, 5, 68, 0.08);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-weight: 800;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--gradient-brand);
  color: #fff;
  font-weight: 900;
}

.brand-text {
  background: var(--gradient-brand);
  background-clip: text;
  color: transparent;
  font-size: 20px;
  letter-spacing: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  min-width: 0;
}

.user-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  padding: 4px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.user-button:hover {
  background: var(--color-tag-bg);
}

.nickname {
  max-width: 160px;
  font-size: 14px;
}

.login-link {
  color: var(--color-primary);
  font-weight: 700;
}

.app-main {
  min-height: calc(100vh - 56px);
}

@media (max-width: 600px) {
  .app-header {
    padding: 0 14px;
  }

  .nickname {
    display: none;
  }

  .user-button {
    padding: 4px;
  }
}
</style>
