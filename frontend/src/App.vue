<template>
  <v-app class="st-app-root">
    <!-- ── Navigation Drawer ─────────────────────────── -->
    <v-navigation-drawer
      v-if="!isLoginRoute"
      v-model="drawer"
      :rail="rail"
      :width="272"
      permanent
      color="surface"
      class="nav-drawer st-drawer-surface"
    >
      <!-- Brand Header -->
      <div class="nav-brand" :class="{ 'nav-brand-rail': rail }">
        <div class="brand-icon-wrap">
          <img src="/logo/jester.png" alt="Super Trump logo" class="brand-logo-img" />
        </div>
        <transition name="brand-fade">
          <div v-if="!rail" class="brand-text-wrap">
            <div class="brand-name">Super Trump</div>
            <div class="brand-tagline">Card Tracker</div>
          </div>
        </transition>
        <v-spacer v-if="!rail" />
        <v-btn
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          variant="text"
          density="compact"
          size="small"
          @click="rail = !rail"
        />
      </div>

      <v-divider class="soft-divider" />

      <v-list density="compact" nav class="mt-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          rounded="lg"
          active-color="primary"
          class="nav-item mb-1"
        />
      </v-list>

      <template #append>
        <v-divider class="soft-divider" />
        <v-list density="compact" nav class="py-2">
          <v-list-item
            prepend-icon="mdi-book-open-variant"
            title="Rules"
            rounded="lg"
            class="nav-item"
            @click="rulesDialog = true"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- ── App Bar ────────────────────────────────────── -->
    <v-app-bar v-if="!isLoginRoute" flat color="surface" class="app-bar-border st-topbar">
      <v-app-bar-nav-icon variant="text" @click="rail = !rail" />
      <div class="app-bar-logo-wrap mr-2">
        <img src="/logo/jester.png" alt="Super Trump logo" class="app-bar-logo-img" />
      </div>
      <v-app-bar-title>
        <span class="font-weight-bold text-on-surface">Super Trump</span>
        <span class="text-caption ml-2 text-medium-emphasis">Scoring System</span>
      </v-app-bar-title>
      <v-spacer />
      <v-chip
        v-if="store.currentUser"
        color="surface-variant"
        size="small"
        label
        class="mr-2"
      >
        <v-icon start size="14">mdi-account</v-icon>
        {{ store.currentUser.username }}
      </v-chip>
      <v-chip color="primary" size="small" label variant="tonal" class="mr-3">
        <v-icon start size="14">mdi-cards</v-icon>
        Live Scoring
      </v-chip>
      <v-tooltip :text="soundEnabled ? 'Sound on' : 'Sound muted'">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :icon="soundEnabled ? 'mdi-volume-high' : 'mdi-volume-off'"
            variant="text"
            color="primary"
            class="mr-1"
            @click="toggleSound"
          />
        </template>
      </v-tooltip>
      <v-btn variant="text" color="primary" prepend-icon="mdi-logout" @click="doLogout">
        Logout
      </v-btn>
    </v-app-bar>

    <!-- ── Main Content ───────────────────────────────── -->
    <v-main :class="{ 'auth-main': isLoginRoute }">
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-main>

    <!-- ── Toast Notifications ───────────────────────── -->
    <v-snackbar
      v-for="n in store.notifications"
      :key="n.id"
      :color="n.type"
      location="bottom right"
      :timeout="4000"
      model-value
    >
      <v-icon start>{{ n.type === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
      {{ n.message }}
    </v-snackbar>

    <!-- ── Rules Dialog ───────────────────────────────── -->
    <v-dialog v-model="rulesDialog" max-width="720" scrollable>
      <v-card color="surface">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon color="secondary" class="mr-2">mdi-cards-playing</v-icon>
          Super Trump — Rules Summary
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="rulesDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4 rules-scroll">
          <div v-for="section in rulesSections" :key="section.title" class="mb-4">
            <div class="text-primary font-weight-bold text-subtitle-1 mb-2">{{ section.title }}</div>
            <div class="text-body-2 text-medium-emphasis preline-text">{{ section.text }}</div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/store'
import { bindTapSounds, soundEnabled, toggleSound } from '@/utils/sound'

const store       = useAppStore()
const route       = useRoute()
const router      = useRouter()
const drawer      = ref(true)
const rail        = ref(false)
const rulesDialog = ref(false)

let unbindTapSounds = null

const isLoginRoute = computed(() => route.name === 'Login')

const navItems = [
  { icon: 'mdi-view-dashboard-outline', title: 'Dashboard',   to: '/'            },
  { icon: 'mdi-account-group',          title: 'Players',     to: '/players'     },
  { icon: 'mdi-cards-outline',          title: 'Games',       to: '/games'       },
  { icon: 'mdi-trophy-outline',         title: 'Leaderboard', to: '/leaderboard' },
]

const rulesSections = [
  {
    title: 'Card Points',
    text:  'Joker — 0 pts (Super Trump, most powerful)\nJack — 3 pts | 9 — 2 pts | A — 1 pt | 10 — 1 pt\nKing, Queen, 8, 7, 6 — 0 pts\nTotal: 56 points per game (2 decks × 4 suits × 7 pts)',
  },
  {
    title: 'Bidding',
    text:  'Minimum bid: 28 | Maximum: 56\nHighest bidder sets trump or declares No Trump.\nBidder asks for 1–2 partner cards (secretly).\nBid ≥ 40 = Honors, lead with trump allowed.',
  },
  {
    title: 'Winning',
    text:  'Bidding team wins if they collect ≥ bid points.\nBid < 40 (Normal): Win = bid/2 | Lose = −bid (each: bidder & partners total)\nBid 40+ (Honors): Win = bid | Lose = −2×bid\nInitial bid 56: Win = 112 | Lose = −224\nUpgraded to 56 mid-game: Win = 84 | Lose = −168',
  },
]

function doLogout() {
  store.logout()
  router.push('/login')
}

onMounted(() => {
  unbindTapSounds = bindTapSounds()
})

onBeforeUnmount(() => {
  unbindTapSounds?.()
})
</script>

<style scoped>
.soft-divider { opacity: 0.1; }
.rules-scroll { max-height: 75vh; }
.preline-text { white-space: pre-line; }

.auth-main {
  padding-top: 0 !important;
}

.st-app-root {
  color: var(--st-text);
}

/* ── Nav Drawer brand header ─────────────────────────────── */
.nav-drawer {
  border-right: 1px solid var(--st-panel-border) !important;
}

.st-drawer-surface {
  box-shadow: 0 2px 14px rgba(16, 24, 40, 0.06);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px 14px 14px;
  min-height: 62px;
}
.nav-brand-rail {
  flex-direction: column;
  gap: 6px;
  padding: 12px 8px;
  min-height: auto;
  align-items: center;
}
.brand-icon-wrap {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: rgba(var(--st-primary-rgb), 0.14);
  box-shadow: 0 8px 14px rgba(var(--st-primary-rgb), 0.18);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.app-bar-logo-wrap {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(var(--st-primary-rgb), 0.12);
  overflow: hidden;
  flex-shrink: 0;
}

.app-bar-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.brand-text-wrap { flex-grow: 1; min-width: 0; }
.brand-name {
  font-size: 0.98rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
  white-space: nowrap;
}
.brand-tagline {
  font-size: 10px;
  color: var(--st-text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:deep(.nav-item) {
  margin-inline: 8px;
  min-height: 42px;
  border-radius: 12px;
}

:deep(.nav-item .v-list-item-title) {
  font-weight: 600;
}

/* Active nav item highlight */
:deep(.nav-item.v-list-item--active) {
  background: rgba(var(--st-primary-rgb), 0.14) !important;
}

/* App bar bottom accent */
.app-bar-border {
  border-bottom: 1px solid var(--st-panel-border) !important;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}

.st-topbar {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
}

/* Brand transition */
.brand-fade-enter-active, .brand-fade-leave-active { transition: opacity 0.15s; }
.brand-fade-enter-from, .brand-fade-leave-to { opacity: 0; }
</style>
