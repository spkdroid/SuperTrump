<template>
  <v-container fluid class="pa-6">
    <div class="st-page-shell">
      <!-- ── Header ──────────────────────────────────────────── -->
      <div class="st-header-row">
        <div>
          <h1 class="st-page-title">Dashboard</h1>
          <p class="st-page-subtitle">Super Trump Scoring Overview</p>
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
            class="stat-card st-lift pa-5"
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
        <v-card color="surface" rounded="xl" elevation="0" class="st-panel">
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
                      class="ml-n2 st-stack-avatar"
                    >
                      <span class="st-avatar-initial-sm">
                        {{ initials(p.name) }}
                      </span>
                    </v-avatar>
                    <v-avatar
                      v-if="(game.players || []).length > 4"
                      color="surface-variant"
                      size="26"
                      class="ml-n2 st-stack-avatar"
                    >
                      <span class="st-avatar-initial-sm">+{{ game.players.length - 4 }}</span>
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
        <v-card color="surface" rounded="xl" elevation="0" class="st-panel st-panel-fill">
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
                      <span class="st-avatar-initial-md">{{ initials(player.name) }}</span>
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

      <!-- ── Activity Feed ─────────────────────────────────── -->
      <v-row class="mt-2 mb-2">
        <v-col cols="12">
          <v-card color="surface" rounded="xl" elevation="0" class="st-panel">
            <v-card-title class="pa-5 pb-2 d-flex align-center flex-wrap gap-2">
              <v-icon color="primary" class="mr-1">mdi-timeline-text-outline</v-icon>
              Activity Feed
              <v-spacer />
              <v-chip size="x-small" label color="surface-variant">
                {{ filteredActivityEvents.length }} events
              </v-chip>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                prepend-icon="mdi-refresh"
                :loading="activityLoading"
                @click="fetchActivity"
              >
                Refresh
              </v-btn>
            </v-card-title>

            <v-card-text class="pa-5 pt-3">
              <div class="d-flex align-center flex-wrap gap-2 mb-3">
                <v-btn-toggle v-model="activityFilter" density="compact" rounded="lg" color="primary">
                  <v-btn value="all" size="small">All</v-btn>
                  <v-btn value="highlights" size="small">Highlights</v-btn>
                  <v-btn value="milestones" size="small">Milestones</v-btn>
                  <v-btn value="mine" size="small">My Activity</v-btn>
                </v-btn-toggle>
                <div class="text-caption text-medium-emphasis">
                  Updated {{ lastActivityRefresh ? relativeTime(lastActivityRefresh) : 'just now' }}
                </div>
              </div>

              <v-card
                v-if="milestoneEvents.length"
                color="surface-variant"
                rounded="lg"
                elevation="0"
                class="pa-4 mb-4 milestone-strip"
              >
                <div class="d-flex align-center flex-wrap gap-2 mb-2">
                  <v-icon color="warning" size="18">mdi-bell-badge-outline</v-icon>
                  <div class="font-weight-bold">Milestone Alerts</div>
                  <v-chip size="x-small" color="warning" variant="tonal" label>
                    {{ milestoneEvents.length }}
                  </v-chip>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="event in milestoneEvents.slice(0, 4)"
                    :key="event.id"
                    :color="event.color || 'warning'"
                    size="small"
                    label
                    variant="tonal"
                    @click="openActivity(event)"
                  >
                    <v-icon start size="14">{{ event.icon }}</v-icon>
                    {{ event.title }}
                  </v-chip>
                </div>
              </v-card>

              <div v-if="activityLoading" class="pa-6 text-center">
                <v-progress-circular indeterminate color="primary" />
              </div>

              <div v-else-if="!filteredActivityEvents.length" class="pa-6 text-center text-medium-emphasis">
                <v-icon size="42" class="mb-2 opacity-30">mdi-timeline-remove-outline</v-icon>
                <div>No activity available for this filter yet.</div>
              </div>

              <v-list v-else bg-color="transparent" class="activity-list pa-0">
                <v-list-item
                  v-for="event in filteredActivityEvents"
                  :key="event.id"
                  class="activity-item px-3 py-2"
                  rounded="lg"
                  @click="openActivity(event)"
                >
                  <template #prepend>
                    <v-avatar v-if="event.player_color" :color="event.player_color" size="30" rounded="lg" class="mr-3">
                      <span class="st-avatar-initial-sm">{{ initials(event.player_name || 'P') }}</span>
                    </v-avatar>
                    <div v-else class="activity-icon-wrap mr-3">
                      <v-icon :color="event.color || 'primary'" size="16">{{ event.icon || 'mdi-bell-outline' }}</v-icon>
                    </div>
                  </template>

                  <v-list-item-title class="text-body-2 font-weight-medium">
                    {{ event.title }}
                  </v-list-item-title>

                  <v-list-item-subtitle class="text-caption">
                    {{ event.subtitle }}
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="text-right d-flex align-center gap-2">
                      <v-chip size="x-small" label :color="event.color || 'info'" variant="tonal">
                        {{ toneLabel(event.type) }}
                      </v-chip>
                      <span class="text-caption text-medium-emphasis">
                        {{ relativeTime(event.occurred_at) }}
                      </span>
                    </div>
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
          <v-card color="surface" rounded="xl" elevation="0" class="st-panel">
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
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { activityAPI, gamesAPI, leaderboardAPI } from '@/api'
import { useAppStore } from '@/store'

const router     = useRouter()
const store      = useAppStore()
const loading    = ref(true)
const allGames   = ref([])
const topPlayers = ref([])
const stats      = ref({})
const activityLoading = ref(false)
const activityEvents = ref([])
const activityFilter = ref('all')
const lastActivityRefresh = ref(null)
let activityPrimed = false
const seenMilestoneIds = new Set()

const activeGames = computed(() => allGames.value.filter(g => g.status === 'active').slice(0, 5))

const filteredActivityEvents = computed(() => {
  const username = store.currentUser?.username

  return activityEvents.value.filter((event) => {
    if (activityFilter.value === 'highlights') {
      return ['high_bid_won', 'high_bid_lost', 'game_completed', 'player_hot_streak'].includes(event.type)
    }

    if (activityFilter.value === 'milestones') {
      return event.type === 'milestone'
    }

    if (activityFilter.value === 'mine') {
      if (!username) return false
      return String(event.player_name || '').toLowerCase() === String(username).toLowerCase()
    }

    return true
  }).slice(0, 20)
})

const milestoneEvents = computed(() =>
  activityEvents.value.filter((event) => event.type === 'milestone').slice(0, 6)
)

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

function toneLabel(type) {
  const labels = {
    high_bid_won: 'Highlight',
    high_bid_lost: 'Alert',
    game_completed: 'Result',
    game_started: 'New Game',
    player_hot_streak: 'Streak',
    player_performance: 'Player',
    milestone: 'Milestone',
    round_recorded: 'Round',
  }
  return labels[type] || 'Update'
}

function relativeTime(value) {
  if (!value) return 'just now'
  const when = new Date(value)
  if (Number.isNaN(when.getTime())) return 'just now'

  const seconds = Math.max(1, Math.floor((Date.now() - when.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

async function fetchActivity() {
  activityLoading.value = true
  try {
    const res = await activityAPI.list({ limit: 30 })
    activityEvents.value = res.data.events || []
    lastActivityRefresh.value = new Date().toISOString()

    const newMilestones = activityEvents.value.filter((event) => event.type === 'milestone')
    if (activityPrimed) {
      for (const event of newMilestones) {
        if (!seenMilestoneIds.has(event.id)) {
          store.notify(event.title, 'info')
          seenMilestoneIds.add(event.id)
        }
      }
    } else {
      for (const event of newMilestones) {
        seenMilestoneIds.add(event.id)
      }
      activityPrimed = true
    }
  } finally {
    activityLoading.value = false
  }
}

function openActivity(event) {
  if (event?.route) router.push(event.route)
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
    await fetchActivity()
  } finally {
    loading.value = false
  }
})

watch(() => store.dataRefreshToken, async () => {
  if (loading.value) return
  const [gRes, lRes, sRes] = await Promise.all([
    gamesAPI.getAll(),
    leaderboardAPI.overall(),
    leaderboardAPI.stats(),
  ])
  allGames.value   = gRes.data
  topPlayers.value = lRes.data.slice(0, 5)
  stats.value      = sRes.data
})
</script>

<style scoped>
/* ── Stat cards ─────────────────────────────────── */
.stat-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--st-panel-border) !important;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: var(--st-hover-shadow) !important; }
.stat-card::after {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
}
.stat-accent-primary::after   { background: linear-gradient(90deg, transparent, rgb(var(--st-primary-rgb)), transparent); }
.stat-accent-info::after      { background: linear-gradient(90deg, transparent, rgb(var(--st-primary-dark-rgb)), transparent); }
.stat-accent-warning::after   { background: linear-gradient(90deg, transparent, #F0A202, transparent); }
.stat-accent-secondary::after { background: linear-gradient(90deg, transparent, rgb(var(--st-secondary-rgb)), transparent); }

.stat-icon-wrap {
  width: 42px; height: 42px;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.si-primary   { background: rgba(var(--st-primary-rgb), 0.12); }
.si-info      { background: rgba(var(--st-primary-dark-rgb), 0.14); }
.si-warning   { background: rgba(240,162,2,0.16); }
.si-secondary { background: rgba(var(--st-secondary-rgb), 0.14); }

/* ── Scoring ref cards ─────────────────────────── */
.ref-card {
  border-left: 3px solid transparent !important;
  transition: transform 0.15s;
}
.ref-card:hover { transform: translateY(-2px); }
.ref-primary { border-left-color: rgb(var(--st-primary-rgb)) !important; }
.ref-info    { border-left-color: rgb(var(--st-primary-dark-rgb)) !important; }
.ref-error   { border-left-color: #D93025 !important; }
.ref-warning { border-left-color: #F0A202 !important; }

.activity-list {
  max-height: 420px;
  overflow-y: auto;
}

.activity-item {
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
}

.activity-item:hover {
  background: rgba(var(--st-primary-rgb), 0.04);
  border-color: rgba(var(--st-primary-rgb), 0.14);
}

.activity-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(var(--st-primary-rgb), 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.milestone-strip {
  border: 1px solid rgba(var(--st-primary-rgb), 0.12);
}
</style>
