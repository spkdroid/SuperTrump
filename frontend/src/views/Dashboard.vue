<template>
  <v-container fluid class="pa-6">
    <!-- ── Header ──────────────────────────────────────────── -->
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Dashboard</h1>
        <p class="text-medium-emphasis text-body-2 mt-1">Super Trump Scoring Overview</p>
      </div>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-cards-outline" to="/games" rounded="lg">
        New Game
      </v-btn>
    </div>

    <!-- ── Stat Cards ──────────────────────────────────────── -->
    <v-row class="mb-4">
      <v-col v-for="stat in statCards" :key="stat.label" cols="12" sm="6" md="3">
        <v-card
          color="surface"
          rounded="xl"
          elevation="0"
          class="stat-card pa-5"
          :class="`stat-accent-${stat.accent}`"
        >
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="stat-icon-wrap" :class="`si-${stat.accent}`">
              <v-icon :color="stat.accent" size="20">{{ stat.icon }}</v-icon>
            </div>
            <v-chip :color="stat.accent" size="x-small" label variant="tonal">{{ stat.badge }}</v-chip>
          </div>
          <div class="text-h3 font-weight-black">
            {{ loading ? '…' : stat.value }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">{{ stat.label }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Active Games + Top Players ─────────────────────── -->
    <v-row>
      <!-- Active Games -->
      <v-col cols="12" md="8">
        <v-card color="surface" rounded="xl" elevation="0"
          style="border: 1px solid rgba(74,222,128,0.12);">
          <v-card-title class="d-flex align-center pa-5 pb-3">
            <v-icon color="primary" class="mr-2">mdi-cards-playing</v-icon>
            Active Games
            <v-spacer />
            <v-btn variant="text" size="small" color="primary" to="/games">View All</v-btn>
          </v-card-title>
          <v-card-text class="pa-0">
            <div v-if="loading" class="pa-6 text-center">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else-if="!activeGames.length" class="pa-8 text-center text-medium-emphasis">
              <v-icon size="48" class="mb-3 opacity-30">mdi-cards-outline</v-icon>
              <div>No active games. Start one!</div>
              <v-btn class="mt-3" color="primary" to="/games" rounded="lg" size="small">
                Create Game
              </v-btn>
            </div>
            <v-list v-else lines="two" bg-color="transparent">
              <v-list-item
                v-for="game in activeGames"
                :key="game.id"
                :to="`/games/${game.id}`"
                rounded="lg"
                class="mx-3 mb-2"
              >
                <template #prepend>
                  <v-avatar color="primary" rounded="lg" size="40">
                    <span class="font-weight-bold text-body-2">{{ game.current_round }}</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">{{ game.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ game.num_players }} players · Round {{ game.current_round }}
                </v-list-item-subtitle>
                <template #append>
                  <div class="d-flex gap-1">
                    <v-avatar
                      v-for="p in (game.players || []).slice(0, 4)"
                      :key="p.id"
                      :color="p.avatar_color"
                      size="26"
                      class="ml-n2"
                      style="border: 2px solid rgb(var(--v-theme-surface));"
                    >
                      <span class="text-caption font-weight-bold" style="font-size: 9px;">
                        {{ initials(p.name) }}
                      </span>
                    </v-avatar>
                    <v-avatar
                      v-if="(game.players || []).length > 4"
                      color="surface-variant"
                      size="26"
                      class="ml-n2"
                      style="border: 2px solid rgb(var(--v-theme-surface));"
                    >
                      <span style="font-size: 9px;">+{{ game.players.length - 4 }}</span>
                    </v-avatar>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Players -->
      <v-col cols="12" md="4">
        <v-card color="surface" rounded="xl" elevation="0"
          style="border: 1px solid rgba(74,222,128,0.12); height: 100%;">
          <v-card-title class="d-flex align-center pa-5 pb-3">
            <v-icon color="secondary" class="mr-2">mdi-trophy</v-icon>
            Top Players
            <v-spacer />
            <v-btn variant="text" size="small" color="primary" to="/leaderboard">All</v-btn>
          </v-card-title>
          <v-card-text class="pa-0">
            <div v-if="loading" class="pa-6 text-center">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else-if="!topPlayers.length" class="pa-6 text-center text-medium-emphasis">
              No players yet.
            </div>
            <v-list v-else bg-color="transparent" class="pa-0">
              <v-list-item
                v-for="(player, i) in topPlayers"
                :key="player.id"
                class="px-5 py-2"
              >
                <template #prepend>
                  <div class="d-flex align-center mr-3">
                    <v-icon
                      :color="['secondary','grey-lighten-1','amber-darken-2'][i] || 'grey'"
                      size="20"
                    >
                      {{ i === 0 ? 'mdi-crown' : 'mdi-circle-small' }}
                    </v-icon>
                    <span class="text-caption font-weight-bold mx-1 text-medium-emphasis">
                      #{{ i + 1 }}
                    </span>
                    <v-avatar :color="player.avatar_color" size="30">
                      <span class="font-weight-bold" style="font-size: 10px;">{{ initials(player.name) }}</span>
                    </v-avatar>
                  </div>
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ player.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ player.games_played }} games · {{ player.win_rate }}% win rate
                </v-list-item-subtitle>
                <template #append>
                  <v-chip
                    :color="player.total_score >= 0 ? 'success' : 'error'"
                    size="x-small"
                    label
                  >
                    {{ player.total_score >= 0 ? '+' : '' }}{{ player.total_score }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Scoring Quick Reference ─────────────────────────── -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card color="surface" rounded="xl" elevation="0"
          style="border: 1px solid rgba(74,222,128,0.12);">
          <v-card-title class="pa-5 pb-3">
            <v-icon color="info" class="mr-2">mdi-calculator-variant</v-icon>
            Scoring Quick Reference
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="ref in scoringRef"
                :key="ref.type"
                cols="12" sm="6" md="3"
              >
                <v-card color="surface-variant" rounded="lg" elevation="0" class="pa-4 ref-card" :class="`ref-${ref.accent}`">
                  <div class="text-caption text-medium-emphasis mb-1">{{ ref.type }}</div>
                  <div class="text-subtitle-2 font-weight-bold mb-2">{{ ref.rule }}</div>
                  <div class="d-flex gap-2 flex-wrap">
                    <v-chip color="success" size="x-small">Win: {{ ref.win }}</v-chip>
                    <v-chip color="error" size="x-small">Lose: {{ ref.lose }}</v-chip>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { gamesAPI, leaderboardAPI } from '@/api'

const loading    = ref(true)
const allGames   = ref([])
const topPlayers = ref([])
const stats      = ref({})

const activeGames = computed(() => allGames.value.filter(g => g.status === 'active').slice(0, 5))

const statCards = computed(() => [
  {
    icon: 'mdi-cards-playing', label: 'Active Games', badge: 'LIVE',
    value: stats.value.active_games ?? 0, accent: 'primary',
  },
  {
    icon: 'mdi-account-group', label: 'Total Players', badge: 'ALL',
    value: stats.value.total_players ?? 0, accent: 'info',
  },
  {
    icon: 'mdi-layers', label: 'Total Rounds', badge: 'PLAYED',
    value: stats.value.total_rounds ?? 0, accent: 'warning',
  },
  {
    icon: 'mdi-chart-line', label: 'Avg Bid', badge: 'STATS',
    value: stats.value.avg_bid ? Number(stats.value.avg_bid).toFixed(1) : '—', accent: 'secondary',
  },
])

const scoringRef = [
  { type: 'Normal (bid < 40)',  rule: '1× multiplier', win: 'bid/2', lose: '−bid',   accent: 'primary'   },
  { type: 'Honors (bid 40–55)', rule: '2× multiplier', win: 'bid',   lose: '−2×bid', accent: 'info'      },
  { type: 'Initial 56',        rule: '4× multiplier', win: '+112',  lose: '−224',   accent: 'error'     },
  { type: 'Upgraded to 56',    rule: '3× multiplier', win: '+84',   lose: '−168',   accent: 'warning'   },
]

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

onMounted(async () => {
  try {
    const [gRes, lRes, sRes] = await Promise.all([
      gamesAPI.getAll(),
      leaderboardAPI.overall(),
      leaderboardAPI.stats(),
    ])
    allGames.value   = gRes.data
    topPlayers.value = lRes.data.slice(0, 5)
    stats.value      = sRes.data
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* ── Stat cards ─────────────────────────────────── */
.stat-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.05) !important;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3) !important; }
.stat-card::after {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
}
.stat-accent-primary::after   { background: linear-gradient(90deg, transparent, #4ADE80, transparent); }
.stat-accent-info::after      { background: linear-gradient(90deg, transparent, #60A5FA, transparent); }
.stat-accent-warning::after   { background: linear-gradient(90deg, transparent, #FBBF24, transparent); }
.stat-accent-secondary::after { background: linear-gradient(90deg, transparent, #FCD34D, transparent); }

.stat-icon-wrap {
  width: 42px; height: 42px;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.si-primary   { background: rgba(74,222,128,0.12); }
.si-info      { background: rgba(96,165,250,0.12); }
.si-warning   { background: rgba(251,191,36,0.12); }
.si-secondary { background: rgba(252,211,77,0.12); }

/* ── Scoring ref cards ─────────────────────────── */
.ref-card {
  border-left: 3px solid transparent !important;
  transition: transform 0.15s;
}
.ref-card:hover { transform: translateY(-2px); }
.ref-primary { border-left-color: #4ADE80 !important; }
.ref-info    { border-left-color: #60A5FA !important; }
.ref-error   { border-left-color: #F87171 !important; }
.ref-warning { border-left-color: #FBBF24 !important; }
</style>
