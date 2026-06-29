<template>
  <v-app>
    <!-- ── Navigation Drawer ─────────────────────────── -->
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent color="surface" class="nav-drawer">
      <!-- Brand Header -->
      <div class="nav-brand" :class="{ 'nav-brand-rail': rail }">
        <div class="brand-icon-wrap">
          <v-icon color="primary" size="22">mdi-cards-playing</v-icon>
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

      <v-divider style="opacity:0.08" />

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
        <v-divider style="opacity:0.08" />
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
    <v-app-bar flat color="surface" class="app-bar-border">
      <v-app-bar-nav-icon variant="text" @click="rail = !rail" />
      <v-app-bar-title>
        <span class="font-weight-bold text-on-surface">Super Trump</span>
        <span class="text-caption ml-2 text-medium-emphasis">Scoring System</span>
      </v-app-bar-title>
      <v-spacer />
      <v-chip color="secondary" size="small" label variant="tonal" class="mr-3">
        <v-icon start size="14">mdi-cards</v-icon>
        Card Game
      </v-chip>
    </v-app-bar>

    <!-- ── Main Content ───────────────────────────────── -->
    <v-main>
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
        <v-card-text class="pa-4" style="max-height: 75vh;">
          <div v-for="section in rulesSections" :key="section.title" class="mb-4">
            <div class="text-primary font-weight-bold text-subtitle-1 mb-2">{{ section.title }}</div>
            <div class="text-body-2 text-medium-emphasis" style="white-space: pre-line;">{{ section.text }}</div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '@/store'

const store       = useAppStore()
const drawer      = ref(true)
const rail        = ref(false)
const rulesDialog = ref(false)

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
</script>

<style>
:root { --v-theme-background: #090E09; }

body { background-color: #090E09 !important; }

.v-application { background-color: #090E09 !important; }

/* Smooth scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0F1810; }
::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(74,222,128,0.35); }
</style>

<style scoped>
/* ── Nav Drawer brand header ─────────────────────────────── */
.nav-drawer { border-right: 1px solid rgba(74,222,128,0.07) !important; }

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
  background: rgba(74,222,128,0.12);
  box-shadow: 0 0 18px rgba(74,222,128,0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.brand-text-wrap { flex-grow: 1; min-width: 0; }
.brand-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  white-space: nowrap;
}
.brand-tagline {
  font-size: 9px;
  color: rgba(255,255,255,0.3);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

/* Active nav item highlight */
:deep(.nav-item.v-list-item--active) {
  background: rgba(74,222,128,0.1) !important;
}

/* App bar bottom accent */
.app-bar-border { border-bottom: 1px solid rgba(74,222,128,0.08) !important; }

/* Brand transition */
.brand-fade-enter-active, .brand-fade-leave-active { transition: opacity 0.15s; }
.brand-fade-enter-from, .brand-fade-leave-to { opacity: 0; }
</style>
