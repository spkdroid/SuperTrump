<template>
  <v-container fluid class="login-page pa-6">
    <div class="login-shell">
      <v-card class="st-panel login-card" color="surface" rounded="xl" elevation="0">
        <div class="login-hero pa-6 pb-4">
          <div class="brand-icon-wrap mb-3">
            <v-icon color="primary" size="24">mdi-cards-playing</v-icon>
          </div>
          <h1 class="st-page-title mb-1">Welcome to Super Trump</h1>
          <p class="st-page-subtitle mb-0">
            Enter a username to continue. Your session will stay active on this device.
          </p>
        </div>

        <v-divider />

        <v-card-text class="pa-6">
          <v-form @submit.prevent="submitLogin">
            <v-text-field
              v-model="username"
              label="Username"
              placeholder="e.g. rahul"
              variant="outlined"
              color="primary"
              density="comfortable"
              prepend-inner-icon="mdi-account"
              :disabled="saving"
              :error-messages="errorMessage ? [errorMessage] : []"
              autofocus
              class="mb-3"
            />

            <v-btn
              block
              type="submit"
              color="primary"
              rounded="lg"
              size="large"
              :loading="saving"
              :disabled="!username.trim()"
            >
              Continue
            </v-btn>
          </v-form>

          <div class="text-caption text-medium-emphasis mt-3">
            Tip: Use username <strong>admin</strong> for admin permissions.
          </div>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const saving = ref(false)
const errorMessage = ref('')

async function submitLogin() {
  const clean = username.value.trim()
  if (!clean) return

  saving.value = true
  errorMessage.value = ''
  try {
    await store.login(clean)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (err) {
    errorMessage.value = err.response?.data?.error || err.message || 'Unable to login'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-shell {
  width: min(460px, 100%);
}

.login-card {
  overflow: hidden;
}

.login-hero {
  background: linear-gradient(160deg, rgba(var(--st-primary-rgb), 0.08), rgba(var(--st-secondary-rgb), 0.06));
}

.brand-icon-wrap {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(var(--st-primary-rgb), 0.12);
  box-shadow: 0 8px 14px rgba(var(--st-primary-rgb), 0.18);
}
</style>
