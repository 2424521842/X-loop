import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { hasMenu } from '../utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const role = ref(localStorage.getItem('admin_role') || '')
  const displayName = ref(localStorage.getItem('admin_displayName') || '')
  const username = ref(localStorage.getItem('admin_username') || '')

  const isLoggedIn = computed(() => !!token.value)

  function setAuth(data) {
    token.value = data.token
    role.value = data.role
    displayName.value = data.displayName
    username.value = data.username
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_role', data.role)
    localStorage.setItem('admin_displayName', data.displayName)
    localStorage.setItem('admin_username', data.username)
  }

  function logout() {
    token.value = ''
    role.value = ''
    displayName.value = ''
    username.value = ''
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_displayName')
    localStorage.removeItem('admin_username')
  }

  function canAccess(menu) {
    return hasMenu(role.value, menu)
  }

  return { token, role, displayName, username, isLoggedIn, setAuth, logout, canAccess }
})
