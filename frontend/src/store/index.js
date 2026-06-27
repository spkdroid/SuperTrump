import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const notifications = ref([])

  function notify(message, type = 'success', timeout = 4000) {
    const id = Date.now() + Math.random()
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, timeout)
  }

  return { notifications, notify }
})
