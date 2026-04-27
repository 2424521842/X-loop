<template>
  <section class="profile-page mobile-page">
    <div class="hero-header">
      <span class="hero-bg-x" aria-hidden="true">X</span>
      <div class="hero-content">
        <el-avatar class="avatar" :size="80" :src="user.avatarUrl || defaultAvatar">
          {{ displayName.slice(0, 1).toUpperCase() }}
        </el-avatar>
        <h1 class="user-name">{{ displayName }}</h1>
        <div class="school-badge">{{ campusText }}</div>
        <button class="verify-chip" type="button" @click="router.push('/profile/edit')">
          {{ user.campus ? '已完成校园认证' : '完成校园认证' }}
        </button>
      </div>
    </div>

    <div class="stats-card">
      <button class="stats-item" type="button" @click="router.push('/my-products')">
        <span class="stats-num">{{ stats.published }}</span>
        <span class="stats-label">发布的</span>
      </button>
      <span class="stats-divider"></span>
      <button class="stats-item" type="button" @click="router.push('/orders')">
        <span class="stats-num">{{ stats.sold }}</span>
        <span class="stats-label">卖出的</span>
      </button>
      <span class="stats-divider"></span>
      <button class="stats-item" type="button" @click="router.push('/orders')">
        <span class="stats-num">{{ stats.bought }}</span>
        <span class="stats-label">购买到的</span>
      </button>
    </div>

    <section class="promo-card">
      <div class="promo-content">
        <h2>校园循环计划</h2>
        <p>让闲置物品重获新生，共建绿色校园</p>
      </div>
      <span class="promo-deco" aria-hidden="true">X</span>
    </section>

    <section class="menu-card">
      <button
        v-for="item in menuItems"
        :key="item.label"
        class="menu-row"
        type="button"
        @click="handleMenu(item)"
      >
        <span class="menu-icon-box" :style="{ background: item.bg }">
          <img class="menu-icon" :src="item.icon" alt="">
        </span>
        <span class="menu-label">{{ item.label }}</span>
        <span v-if="item.value" class="menu-value">{{ item.value }}</span>
        <span class="menu-arrow">&gt;</span>
      </button>
    </section>

    <footer class="footer">
      <span>版本 2.4.1</span>
    </footer>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { CAMPUS_OPTIONS } from '../utils/format'
import defaultAvatar from '../assets/mobile/default-avatar.png'
import iconCampus from '../assets/mobile/icon-campus-v2.png'
import iconEmail from '../assets/mobile/icon-email-v2.png'
import iconFavorite from '../assets/mobile/icon-favorite-v2.png'
import iconFeedback from '../assets/mobile/icon-feedback-v2.png'
import iconMessage from '../assets/mobile/icon-message-v2.png'
import iconOrder from '../assets/mobile/icon-order-v2.png'

const router = useRouter()
const userStore = useUserStore()

const user = computed(() => userStore.user || {})
const userId = computed(() => user.value.id || user.value._id || '')
const displayName = computed(() => user.value.nickName || user.value.email || 'X-Loop 用户')
const campusText = computed(() => {
  const match = CAMPUS_OPTIONS.find((item) => item.value === user.value.campus)
  return match?.label || '西交利物浦大学'
})
const maskedEmail = computed(() => {
  const email = user.value.email || ''
  if (!email) return '未认证'
  const [prefix] = email.split('@')
  return `${prefix.slice(0, 2) || '**'}***@xjtlu.edu.cn`
})
const stats = computed(() => ({
  published: user.value.productCount ?? 0,
  sold: user.value.soldCount ?? 0,
  bought: user.value.boughtCount ?? 0
}))

const menuItems = computed(() => [
  { label: '校园邮箱', value: maskedEmail.value, icon: iconEmail, bg: '#f0e6f6', to: '/profile/edit' },
  { label: '所在校区', value: campusText.value, icon: iconCampus, bg: '#dfe0ff', to: '/profile/edit' },
  { label: '我的发布', icon: iconFavorite, bg: '#ffd7f3', to: '/my-products' },
  { label: '我的订单', icon: iconOrder, bg: '#dfe0ff', to: '/orders' },
  { label: '我的消息', icon: iconMessage, bg: '#d7f0ff', to: '/chat-list' },
  { label: '收到的评价', icon: iconFeedback, bg: '#e9e7eb', to: `/reviews/${userId.value}` },
  { label: '编辑资料', icon: iconCampus, bg: '#dfe0ff', to: '/profile/edit' },
  { label: '退出登录', icon: iconFeedback, bg: '#ffdad7', action: 'logout' }
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
  min-height: calc(100vh - var(--mobile-nav-height));
  padding-bottom: 32px;
}

.hero-header {
  position: relative;
  overflow: hidden;
  padding: 42px 0 86px;
  background: linear-gradient(135deg, #010544 0%, #CE57C1 100%);
}

.hero-bg-x {
  position: absolute;
  top: -46px;
  right: -34px;
  color: rgba(255, 255, 255, 0.06);
  font-size: 230px;
  font-weight: 900;
  line-height: 1;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.avatar {
  border: 3px solid #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.user-name {
  margin: 12px 20px 8px;
  overflow: hidden;
  color: #fff;
  font-size: 19px;
  font-weight: 800;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-badge,
.verify-chip {
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 700;
}

.school-badge {
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 12px;
}

.verify-chip {
  margin-top: 10px;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.16);
  cursor: pointer;
  font-size: 12px;
}

.stats-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  margin: -48px 16px 0;
  padding: 22px 10px;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-float);
}

.stats-item {
  flex: 1;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.stats-num {
  color: #cb55bf;
  font-size: 22px;
  font-weight: 800;
}

.stats-label {
  margin-top: 4px;
  color: #777681;
  font-size: 12px;
}

.stats-divider {
  width: 1px;
  height: 30px;
  background: #eee;
}

.promo-card {
  position: relative;
  overflow: hidden;
  margin: 14px 16px 0;
  padding: 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a1068 0%, #6b2fa0 50%, #cb55bf 100%);
}

.promo-content {
  position: relative;
  z-index: 1;
}

.promo-card h2 {
  margin: 0 0 6px;
  color: #fff;
  font-size: 17px;
}

.promo-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}

.promo-deco {
  position: absolute;
  top: -22px;
  right: -8px;
  color: rgba(255, 255, 255, 0.07);
  font-size: 120px;
  font-weight: 900;
  line-height: 1;
}

.menu-card {
  overflow: hidden;
  margin: 14px 16px 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-card);
}

.menu-row {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 60px;
  padding: 0 16px;
  border: 0;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.menu-row::after {
  content: "";
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 50px;
  height: 1px;
  background: #f0f0f0;
}

.menu-row:last-child::after {
  display: none;
}

.menu-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  border-radius: 9px;
}

.menu-icon {
  width: 21px;
  height: 21px;
  object-fit: contain;
}

.menu-label {
  flex: 1;
  min-width: 0;
  color: #1b1b1e;
  font-size: 15px;
  font-weight: 700;
}

.menu-value {
  max-width: 44%;
  overflow: hidden;
  color: #777681;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-arrow {
  margin-left: 8px;
  color: #c0bfc5;
  font-size: 14px;
  font-weight: 700;
}

.footer {
  padding: 28px 0 10px;
  color: #c0bfc5;
  font-size: 11px;
  text-align: center;
}
</style>
