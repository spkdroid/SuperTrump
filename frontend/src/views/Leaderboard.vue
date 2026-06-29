<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Leaderboard</h1>
        <p class="text-medium-emphasis text-body-2 mt-1">All-time player rankings</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="56" />
    </div>

    <template v-else>
      <!-- Champion Banner -->
      <v-card
        v-if="players.length"
        color="surface-variant"
        rounded="xl"
        elevation="0"
        class="mb-6 pa-6 champion-banner"
        style="border: 1px solid rgba(252,211,77,0.3);"
      >
        <div class="d-flex align-center gap-5 flex-wrap">
          <v-avatar :color="players[0].avatar_color" size="80" rounded="xl">
            <span class="text-h5 font-weight-black" style="color: rgba(0,0,0,0.7);">
              {{ initials(players[0].name) }}
            </span>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="d-flex align-center gap-2 mb-1">
              <v-icon color="secondary" size="28">mdi-crown</v-icon>
              <span class="text-h5 font-weight-black text-secondary">{{ players[0].name }}</span>
              <v-chip color="secondary" size="small" label>Champion</v-chip>
            </div>
            <div class="text-medium-emphasis text-body-2">
              {{ players[0].games_played }} games · {{ players[0].win_rate }}% win rate ·
              {{ players[0].rounds_as_bidder }} bids ({{ players[0].bidder_success_rate }}% success)
            </div>
          </div>
          <div class="text-right">
            <div class="text-h3 font-weight-black text-secondary">
              {{ players[0].total_score >= 0 ? '+' : '' }}{{ players[0].total_score }}
            </div>
            <div class="text-caption text-medium-emphasis">Total Score</div>
          </div>
        </div>
      </v-card>

      <!-- Stats Row -->
      <v-row class="mb-4">
        <v-col v-for="s in statCards" :key="s.label" cols="6" md="3">
          <v-card color="surface" rounded="xl" elevation="0"
            class="pa-4 text-center"
            style="border: 1px solid rgba(74,222,128,0.12);">
            <div class="text-h5 font-weight-black" :class="s.textClass">{{ s.value }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ s.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Score Chart -->
      <v-card color="surface" rounded="xl" elevation="0" class="mb-4"
        style="border: 1px solid rgba(74,222,128,0.12);">
        <v-card-title class="pa-5 pb-3 d-flex align-center">
          <v-icon color="info" class="mr-2">mdi-chart-bar</v-icon>
          Overall Score Comparison
        </v-card-title>
        <v-card-text>
          <apexchart
            v-if="players.length"
            type="bar"
            height="260"
            :options="barOptions"
            :series="barSeries"
          />
        </v-card-text>
      </v-card>

      <!-- Rankings Table -->
      <v-card color="surface" rounded="xl" elevation="0"
        style="border: 1px solid rgba(74,222,128,0.12);">
        <v-card-title class="pa-5 pb-3 d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-format-list-numbered</v-icon>
          Full Rankings
        </v-card-title>
        <v-card-text class="pa-0">
          <v-table density="comfortable" class="leaderboard-table">
            <thead>
              <tr>
                <th class="text-left pl-6">#</th>
                <th class="text-left">Player</th>
                <th class="text-right">Score</th>
                <th class="text-right">Games</th>
                <th class="text-right">Wins</th>
                <th class="text-right">Win%</th>
                <th class="text-right">Bids</th>
                <th class="text-right">Bid%</th>
                <th class="text-right pr-6">Rounds</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(player, idx) in players"
                :key="player.id"
                :class="{ 'top-row': idx === 0 }"
              >
                <td class="pl-6">
                  <v-icon
                    v-if="idx < 3"
                    :color="['secondary','grey-lighten-2','amber-darken-3'][idx]"
                    size="18"
                  >mdi-crown</v-icon>
                  <span v-else class="text-medium-emphasis text-body-2">{{ idx + 1 }}</span>
                </td>
                <td>
                  <div class="d-flex align-center gap-2 py-2">
                    <v-avatar :color="player.avatar_color" size="32" rounded="lg">
                      <span class="font-weight-bold" style="font-size: 10px; color: rgba(0,0,0,0.7);">
                        {{ initials(player.name) }}
                      </span>
                    </v-avatar>
                    <span class="text-body-2 font-weight-medium">{{ player.name }}</span>
                  </div>
                </td>
                <td class="text-right">
                  <v-chip
                    :color="player.total_score >= 0 ? 'success' : 'error'"
                    size="small"
                    label
                    class="font-weight-black"
                  >
                    {{ player.total_score >= 0 ? '+' : '' }}{{ player.total_score }}
                  </v-chip>
                </td>
                <td class="text-right text-body-2">{{ player.games_played }}</td>
                <td class="text-right text-body-2 text-success">{{ player.games_won }}</td>
                <td class="text-right text-body-2">{{ player.win_rate }}%</td>
                <td class="text-right text-body-2">{{ player.rounds_as_bidder }}</td>
                <td class="text-right text-body-2">{{ player.bidder_success_rate }}%</td>
                <td class="text-right text-body-2 pr-6">{{ player.rounds_played }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="!players.length" class="text-center pa-12 text-medium-emphasis">
            <v-icon size="64" class="mb-4 opacity-30">mdi-trophy-outline</v-icon>
            <div>No ranking data yet. Play some games!</div>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { leaderboardAPI } from '@/api'

const loading = ref(true)
const players = ref([])
const stats   = ref({})

function initials(n = '') { return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }

const statCards = computed(() => [
  { label: 'Players',       value: stats.value.total_players   ?? 0,  textClass: 'text-primary'   },
  { label: 'Games Played',  value: stats.value.total_games      ?? 0,  textClass: 'text-info'      },
  { label: 'Rounds',        value: stats.value.total_rounds     ?? 0,  textClass: 'text-warning'   },
  { label: 'Avg Bid',       value: stats.value.avg_bid ? Number(stats.value.avg_bid).toFixed(1) : '—', textClass: 'text-secondary' },
])

const barSeries  = computed(() => [{
  name: 'Total Score',
  data: players.value.map(p => p.total_score),
}])

const barOptions = computed(() => ({
  chart:  { background: 'transparent', toolbar: { show: false } },
  theme:  { mode: 'dark' },
  colors: players.value.map(p => p.avatar_color),
  xaxis:  { categories: players.value.map(p => p.name), labels: { style: { colors: '#9CA3AF' } } },
  yaxis:  { labels: { style: { colors: '#9CA3AF' }, formatter: v => (v >= 0 ? `+${v}` : `${v}`) } },
  grid:   { borderColor: '#1B3320' },
  plotOptions: {
    bar: {
      distributed: true,
      borderRadius: 6,
      columnWidth: '55%',
    },
  },
  legend:  { show: false },
  tooltip: { theme: 'dark' },
}))

onMounted(async () => {
  loading.value = true
  try {
    const [lRes, sRes] = await Promise.all([
      leaderboardAPI.overall(),
      leaderboardAPI.stats(),
    ])
    players.value = lRes.data
    stats.value   = sRes.data
  } finally { loading.value = false }
})
</script>

<style scoped>
.champion-banner {
  background: linear-gradient(135deg, rgba(74,222,128,0.07) 0%, rgba(252,211,77,0.04) 100%) !important;
}
.leaderboard-table thead tr th {
  background: rgba(74,222,128,0.04) !important;
  color: #9CA3AF !important;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.top-row { background: rgba(252,211,77,0.04) !important; }
</style>
