<template>
  <el-header class="header">
    <div class="header-left">
      <el-icon class="collapse-btn" @click="$emit('toggle-collapse')"><Fold /></el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-right">
      <span class="user-info">{{ authStore.displayName }} ({{ roleLabel }})</span>
      <el-button text @click="handleLogout">退出</el-button>
    </div>
  </el-header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Fold } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { ROLE_LABELS } from '../../utils/permission'

defineEmits(['toggle-collapse'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const roleLabel = computed(() => ROLE_LABELS[authStore.role] || authStore.role)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}

.user-info {
  color: #666;
  font-size: 14px;
}
</style>
