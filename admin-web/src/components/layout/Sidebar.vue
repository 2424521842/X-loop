<template>
  <el-aside :width="collapsed ? '64px' : '220px'" class="sidebar">
    <div class="logo">
      <span v-if="!collapsed">X-Loop Admin</span>
      <span v-else>X</span>
    </div>
    <el-menu
      :default-active="activeMenu"
      :collapse="collapsed"
      router
      background-color="#010544"
      text-color="#ccc"
      active-text-color="#CE57C1"
    >
      <el-menu-item v-if="canAccess('dashboard')" index="/dashboard">
        <el-icon><DataAnalysis /></el-icon>
        <template #title>数据看板</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('users')" index="/users">
        <el-icon><User /></el-icon>
        <template #title>用户管理</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('products')" index="/products">
        <el-icon><Goods /></el-icon>
        <template #title>商品管理</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('reports')" index="/reports">
        <el-icon><Warning /></el-icon>
        <template #title>举报处理</template>
      </el-menu-item>
      <el-menu-item v-if="canAccess('orders')" index="/orders">
        <el-icon><List /></el-icon>
        <template #title>订单管理</template>
      </el-menu-item>
      <el-sub-menu v-if="canAccess('system')" index="system">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </template>
        <el-menu-item index="/system/admins">管理员管理</el-menu-item>
        <el-menu-item index="/system/logs">操作日志</el-menu-item>
        <el-menu-item index="/system/categories">分类管理</el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { DataAnalysis, User, Goods, Warning, List, Setting } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

defineProps({ collapsed: Boolean })

const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => '/' + route.path.split('/').filter(Boolean).slice(0, 1).join('/'))
const canAccess = menu => authStore.canAccess(menu)
</script>

<style scoped>
.sidebar {
  background: #010544;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
