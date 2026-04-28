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
          {{ user.campus ? t('profile.verified') : t('profile.verify') }}
        </button>
      </div>
    </div>

    <div class="stats-card">
      <button class="stats-item" type="button" @click="router.push('/my-products')">
        <span class="stats-num">{{ stats.published }}</span>
        <span class="stats-label">{{ t('profile.published') }}</span>
      </button>
      <span class="stats-divider"></span>
      <button class="stats-item" type="button" @click="router.push('/orders')">
        <span class="stats-num">{{ stats.sold }}</span>
        <span class="stats-label">{{ t('profile.sold') }}</span>
      </button>
      <span class="stats-divider"></span>
      <button class="stats-item" type="button" @click="router.push('/orders')">
        <span class="stats-num">{{ stats.bought }}</span>
        <span class="stats-label">{{ t('profile.bought') }}</span>
      </button>
    </div>

    <section class="promo-card">
      <div class="promo-content">
        <h2>{{ t('profile.promoTitle') }}</h2>
        <p>{{ t('profile.promoDesc') }}</p>
      </div>
      <span class="promo-deco" aria-hidden="true">X</span>
    </section>

    <section class="menu-card">
      <button
        v-for="item in menuItems"
        :key="item.id"
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
      <span>{{ t('common.version', { version: '2.4.1' }) }}</span>
    </footer>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { getCampusFullLabel } from '../utils/format'
import { useI18n } from '../utils/i18n'
import defaultAvatar from '../assets/mobile/default-avatar.png'
import iconCampus from '../assets/mobile/icon-campus-v2.png'
import iconEmail from '../assets/mobile/icon-email-v2.png'
import iconFavorite from '../assets/mobile/icon-favorite-v2.png'
import iconFeedback from '../assets/mobile/icon-feedback-v2.png'
import iconOrder from '../assets/mobile/icon-order-v2.png'

const router = useRouter()
const userStore = useUserStore()
const { localeStore, t } = useI18n()

const user = computed(() => userStore.user || {})
const userId = computed(() => user.value.id || user.value._id || '')
const displayName = computed(() => user.value.nickName || user.value.email || t('common.userFallback'))
const campusText = computed(() => getCampusFullLabel(user.value.campus, t, 'campus.school'))
const maskedEmail = computed(() => {
  const email = user.value.email || ''
  if (!email) return t('profile.unverified')
  const [prefix] = email.split('@')
  return `${prefix.slice(0, 2) || '**'}***@xjtlu.edu.cn`
})
const stats = computed(() => ({
  published: user.value.productCount ?? 0,
  sold: user.value.soldCount ?? 0,
  bought: user.value.boughtCount ?? 0
}))

const menuItems = computed(() => [
  { id: 'email', label: t('profile.email'), value: maskedEmail.value, icon: iconEmail, bg: '#f0e6f6', to: '/profile/edit' },
  { id: 'campus', label: t('profile.campus'), value: campusText.value, icon: iconCampus, bg: '#dfe0ff', to: '/profile/edit' },
  { id: 'language', label: t('profile.language'), value: t('profile.currentLanguage'), icon: iconFeedback, bg: '#e9e7eb', action: 'language' },
  { id: 'my-products', label: t('profile.myProducts'), icon: iconFavorite, bg: '#ffd7f3', to: '/my-products' },
  { id: 'orders', label: t('profile.myOrders'), icon: iconOrder, bg: '#dfe0ff', to: '/orders' },
  { id: 'reviews', label: t('profile.reviews'), icon: iconFeedback, bg: '#e9e7eb', to: `/reviews/${userId.value}` },
  { id: 'edit', label: t('profile.editProfile'), icon: iconCampus, bg: '#dfe0ff', to: '/profile/edit' },
  { id: 'logout', label: t('profile.logout'), icon: iconFeedback, bg: '#ffdad7', action: 'logout' }
])

async function handleMenu(item) {
  if (item.action === 'language') {
    localeStore.toggleLocale()
    ElMessage.success(t('profile.languageChanged'))
    return
  }
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
