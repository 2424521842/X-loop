<template>
  <section class="profile-page">
    <div class="profile-hero">
      <el-avatar :size="80" :src="user.avatarUrl">
        {{ displayName.slice(0, 1).toUpperCase() }}
      </el-avatar>
      <div class="profile-text">
        <h1>{{ displayName }}</h1>
        <p>{{ campusText }} · 信誉分 {{ user.credit ?? 100 }}</p>
        <p>{{ maskedEmail }}</p>
      </div>
    </div>

    <div class="menu-list">
      <button
        v-for="item in menuItems"
        :key="item.label"
        class="menu-entry"
        type="button"
        @click="handleMenu(item)"
      >
        <span class="menu-left">
          <el-icon class="menu-icon">
            <span aria-hidden="true">{{ item.icon }}</span>
          </el-icon>
          <span>{{ item.label }}</span>
        </span>
        <span class="menu-arrow">&gt;</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { CAMPUS_OPTIONS } from '../utils/format'

const router = useRouter()
const userStore = useUserStore()

const user = computed(() => userStore.user || {})
const userId = computed(() => user.value.id || user.value._id || '')
const displayName = computed(() => user.value.nickName || user.value.email || 'X-Loop 用户')
const campusText = computed(() => {
  const match = CAMPUS_OPTIONS.find((item) => item.value === user.value.campus)
  return match?.label || '未选择校区'
})
const maskedEmail = computed(() => {
  const email = user.value.email || ''
  if (!email) return ''
  const prefix = email.split('@')[0].slice(0, 2) || '**'
  return `${prefix}***@xjtlu.edu.cn`
})

const menuItems = computed(() => [
  { label: '我的发布', icon: '◎', to: '/my-products' },
  { label: '我的订单', icon: '□', to: '/orders' },
  { label: '我的消息', icon: '◇', to: '/chat-list' },
  { label: '收到的评价', icon: '☆', to: `/reviews/${userId.value}` },
  { label: '编辑资料', icon: '✎', to: '/profile/edit' },
  { label: '退出登录', icon: '↩', action: 'logout' }
])

async function handleMenu(item) {
  if (item.action === 'logout') {
    await userStore.logout()
    router.push('/login')
    return
  }
  router.push(item.to)
}
</script>

<style scoped lang="scss">
.profile-page {
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 28px 16px 48px;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 160px;
  padding: 24px;
  border-radius: 8px;
  background: var(--gradient-brand);
  color: #fff;
}

.profile-text {
  min-width: 0;
}

.profile-text h1 {
  margin: 0 0 10px;
  overflow: hidden;
  font-size: 20px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-text p {
  margin: 4px 0;
  opacity: 0.9;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.menu-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 54px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--shadow-card);
  color: var(--color-text);
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
}

.menu-entry:hover {
  background: var(--color-tag-bg);
}

.menu-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.menu-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-tag-bg);
  color: var(--color-primary);
  font-size: 13px;
}

.menu-arrow {
  color: var(--color-text-secondary);
  font-weight: 700;
}

@media (max-width: 600px) {
  .profile-page {
    padding: 18px 12px 36px;
  }

  .profile-hero {
    padding: 20px;
  }
}
</style>
