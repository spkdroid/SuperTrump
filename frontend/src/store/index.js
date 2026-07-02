import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { clearSession, loadSession, saveSession } from '@/utils/session'

export const useAppStore = defineStore('app', () => {
  const notifications = ref([])
  const currentUser = ref(loadSession())
  const dataRefreshToken = ref(0)

  const isAuthenticated = computed(() => Boolean(currentUser.value?.username))
  const isAdmin = computed(() => currentUser.value?.role === 'admin')

  function notify(message, type = 'success', timeout = 4000) {
    const id = Date.now() + Math.random()
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, timeout)
  }

  async function login(username) {
    const clean = String(username || '').trim()
    if (!clean) {
      throw new Error('Username is required')
    }

    const response = await axios.post('/api/auth/login', { username: clean })
    currentUser.value = response.data
    saveSession(response.data)
    notify(`Welcome, ${response.data.username}!`)
    return response.data
  }

  function logout() {
    const previous = currentUser.value?.username
    currentUser.value = null
    clearSession()
    if (previous) {
      notify(`Signed out: ${previous}`, 'info')
    }
  }

  function triggerDataRefresh() {
    dataRefreshToken.value += 1
  }

  function canManageGame(game) {
    if (!currentUser.value || !game) return false
    if (isAdmin.value) return true
    return game.owner_user_id === currentUser.value.id || game.owner_username === currentUser.value.username
  }

  return {
    notifications,
    currentUser,
    isAuthenticated,
    isAdmin,
    notify,
    login,
    logout,
    triggerDataRefresh,
    dataRefreshToken,
    canManageGame,
  }
})
