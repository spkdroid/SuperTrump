<template>
  <v-app>
    <!-- ── Navigation Drawer ─────────────────────────── -->
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent color="surface">
      <v-list-item
        prepend-icon="mdi-cards-playing"
        title="Super Trump"
        nav
        class="py-4"
      >
        <template #append>
          <v-btn
            :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            variant="text"
            density="compact"
            @click="rail = !rail"
          />
        </template>
      </v-list-item>

      <v-divider class="mb-2" />

      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          rounded="lg"
          active-color="primary"
        />
      </v-list>

      <template #append>
        <v-divider />
        <v-list density="compact" nav class="pb-2">
          <v-list-item
            prepend-icon="mdi-book-open-variant"
            title="Rules"
            rounded="lg"
            @click="rulesDialog = true"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- ── App Bar ────────────────────────────────────── -->
    <v-app-bar flat color="surface" border="b">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>
        <span class="text-primary font-weight-bold">Super Trump</span>
        <span class="text-medium-emphasis text-body-2 ml-2">Scoring System</span>
      </v-app-bar-title>
      <v-spacer />
      <v-chip color="secondary" size="small" label class="mr-3">
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
:root { --v-theme-background: #0A0F0A; }

body { background-color: #0A0F0A !important; }

.v-application { background-color: #0A0F0A !important; }

/* Smooth scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #111A11; }
::-webkit-scrollbar-thumb { background: #22C55E44; border-radius: 3px; }
</style>
