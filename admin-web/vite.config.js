import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000
  },
  resolve: {
    // 强制 Vite 使用浏览器版本的入口，而非 Node.js 版本
    conditions: ['browser', 'import', 'module', 'default']
  },
  optimizeDeps: {
    include: ['@cloudbase/js-sdk']
  }
})
