<template>
  <el-container class="app-layout">
    <Sidebar :collapsed="collapsed" />
    <el-container>
      <Header @toggle-collapse="collapsed = !collapsed" />
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

const collapsed = ref(false)
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.main-content {
  background: #f5f5f5;
  padding: 20px;
}
</style>
