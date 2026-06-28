<template>
  <v-container fluid class="pa-6">
    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="56" />
    </div>

    <template v-else-if="game">
      <!-- ── Header ───────────────────────────────────────── -->
      <div class="d-flex align-start mb-6 gap-3 flex-wrap">
        <v-btn icon="mdi-arrow-left" variant="text" @click="$router.push('/games')" />
        <div class="flex-grow-1">
          <div class="d-flex align-center gap-2 flex-wrap">
            <h1 class="text-h4 font-weight-bold text-primary">{{ game.name }}</h1>
            <v-chip
              :color="game.status === 'active' ? 'success' : 'grey'"
              label
              size="small"
            >
              {{ game.status === 'active' ? 'LIVE' : 'COMPLETED' }}
            </v-chip>
          </div>
          <p class="text-medium-emphasis text-body-2 mt-1">
            {{ game.num_players }} players · {{ rounds.length }} rounds played ·
            Started {{ fmtDate(game.created_at) }}
          </p>
        </div>
        <div class="d-flex gap-2 align-center flex-wrap">
          <v-btn
            v-if="game.status === 'active'"
            color="primary"
            prepend-icon="mdi-plus"
            rounded="lg"
            @click="lastRoundMode = false; roundDialog = true"
          >
            Add Round
          </v-btn>
          <v-btn
            v-if="game.status === 'active'"
            color="warning"
            prepend-icon="mdi-flag-triangle"
            rounded="lg"
            @click="lastRoundMode = true; roundDialog = true"
          >
            Last Round
          </v-btn>
          <v-btn
            v-if="game.status === 'active'"
            color="secondary"
            variant="outlined"
            prepend-icon="mdi-flag-checkered"
            rounded="lg"
            @click="completeDialog = true"
          >
            End Game
          </v-btn>
        </div>
      </div>

      <!-- ── Leaderboard + Chart ──────────────────────────── -->
      <v-row class="mb-4">
        <!-- Live Leaderboard -->
        <v-col cols="12" md="5">
          <v-card color="surface" rounded="xl" elevation="0"
            style="border: 1px solid rgba(74,222,128,0.12); height:100%;">
            <v-card-title class="pa-5 pb-3 d-flex align-center">
              <v-icon color="secondary" class="mr-2">mdi-trophy</v-icon>
              Standings
            </v-card-title>
            <v-card-text class="pa-0">
              <div
                v-for="(entry, idx) in leaderboard"
                :key="entry.player_id"
                class="d-flex align-center px-5 py-3"
                :class="{ 'leader-row': idx === 0 }"
              >
                <!-- Rank -->
                <div class="rank-badge mr-3" :class="`rank-${idx + 1}`">
                  <v-icon
                    v-if="idx < 3"
                    :color="['secondary','grey-lighten-2','amber-darken-3'][idx]"
                    size="18"
                  >mdi-crown</v-icon>
                  <span v-else class="text-caption font-weight-bold text-medium-emphasis">
                    {{ idx + 1 }}
                  </span>
                </div>

                <!-- Avatar + Name -->
                <v-avatar :color="entry.avatar_color" size="34" rounded="lg" class="mr-3">
                  <span class="font-weight-bold" style="font-size: 11px; color: rgba(0,0,0,0.7);">
                    {{ initials(entry.player_name) }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium">{{ entry.player_name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ entry.rounds_played }} rounds · {{ entry.times_bidder }} bids
                    <span v-if="entry.times_bidder > 0">
                      ({{ Math.round(entry.bids_won / entry.times_bidder * 100) }}% won)
                    </span>
                  </div>
                </div>

                <!-- Score -->
                <div class="text-right">
                  <v-chip
                    :color="entry.current_score >= 0 ? 'success' : 'error'"
                    size="small"
                    label
                    class="font-weight-black"
                  >
                    {{ entry.current_score >= 0 ? '+' : '' }}{{ entry.current_score }}
                  </v-chip>
                </div>
              </div>
              <div v-if="!leaderboard.length" class="text-center pa-8 text-medium-emphasis">
                No rounds played yet.
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Score Chart -->
        <v-col cols="12" md="7">
          <v-card color="surface" rounded="xl" elevation="0"
            style="border: 1px solid rgba(74,222,128,0.12); height:100%;">
            <v-card-title class="pa-5 pb-3 d-flex align-center">
              <v-icon color="info" class="mr-2">mdi-chart-line</v-icon>
              Score Progression
            </v-card-title>
            <v-card-text>
              <div v-if="chartData.series.length && rounds.length">
                <apexchart
                  type="line"
                  height="280"
                  :options="chartOptions"
                  :series="chartData.series"
                />
              </div>
              <div v-else class="text-center py-12 text-medium-emphasis">
                <v-icon size="48" class="mb-3 opacity-30">mdi-chart-line</v-icon>
                <div>Chart appears after the first round</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ── Round History ───────────────────────────────── -->
      <RoundHistory :rounds="rounds" @delete="onRoundDeleted" />
    </template>

    <!-- ── Add Round Dialog ─────────────────────────────── -->
    <RoundEntry
      v-if="game"
      v-model="roundDialog"
      :game="game"
      :last-round="lastRoundMode"
      @saved="onRoundSaved"
    />

    <!-- End Game Confirm -->
    <v-dialog v-model="completeDialog" max-width="380">
      <v-card color="surface" rounded="xl">
        <v-card-title class="pa-5 pb-3">
          <v-icon color="secondary" class="mr-2">mdi-flag-checkered</v-icon>
          End Game?
        </v-card-title>
        <v-card-text class="pa-5 pt-0 text-medium-emphasis">
          This will finalise all scores and crown a winner. You can still view the
          game history afterwards.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="completeDialog = false">Cancel</v-btn>
          <v-btn color="secondary" rounded="lg" :loading="saving" @click="completeGame()">
            End &amp; Declare Winner
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 🏆 Winner Announcement -->
    <v-dialog v-model="winnerDialog" max-width="460" persistent>
      <v-card color="surface" rounded="xl" style="overflow:hidden;">
        <!-- Celebration header -->
        <div style="background:linear-gradient(135deg,rgba(74,222,128,0.18),rgba(250,204,21,0.12));padding:32px 24px 20px;text-align:center;">
          <div style="font-size:72px;line-height:1;margin-bottom:12px;">🏆</div>
          <div class="text-h4 font-weight-black text-secondary">Game Over!</div>
          <div v-if="leaderboard[0]" class="text-h5 font-weight-bold text-white mt-2">
            {{ leaderboard[0].player_name }} wins!
          </div>
          <v-chip
            v-if="leaderboard[0]"
            :color="leaderboard[0].avatar_color"
            size="large"
            label
            class="mt-3 px-6"
            style="font-size:18px;font-weight:900;"
          >
            {{ leaderboard[0].current_score >= 0 ? '+' : '' }}{{ leaderboard[0].current_score }} pts
          </v-chip>
        </div>

        <v-card-text class="pa-5">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-3 text-center">FINAL STANDINGS</div>
          <div
            v-for="(entry, idx) in leaderboard"
            :key="entry.player_id"
            class="d-flex align-center mb-2 px-3 py-2 rounded-lg"
            :style="idx === 0 ? 'background:rgba(74,222,128,0.08);' : ''"
          >
            <div class="text-subtitle-1 mr-3" style="width:28px;text-align:center;">
              {{ ['🥇','🥈','🥉'][idx] ?? (idx + 1) }}
            </div>
            <v-avatar :color="entry.avatar_color" size="30" rounded="lg" class="mr-3">
              <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.7);">{{ initials(entry.player_name) }}</span>
            </v-avatar>
            <span class="flex-grow-1 text-body-2 font-weight-medium">{{ entry.player_name }}</span>
            <div class="text-caption text-medium-emphasis mr-3">{{ entry.rounds_played }} rounds</div>
            <v-chip
              :color="entry.current_score >= 0 ? 'success' : 'error'"
              size="small" label class="font-weight-bold"
            >
              {{ entry.current_score >= 0 ? '+' : '' }}{{ entry.current_score }}
            </v-chip>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4 d-flex gap-3">
          <v-btn
            variant="outlined" color="primary" rounded="lg" class="flex-grow-1"
            @click="winnerDialog = false; $router.push('/games')"
          >
            <v-icon start size="18">mdi-plus-circle</v-icon> New Game
          </v-btn>
          <v-btn
            color="secondary" rounded="lg" class="flex-grow-1"
            @click="winnerDialog = false"
          >
            <v-icon start size="18">mdi-eye</v-icon> View Results
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { gamesAPI } from '@/api'
import { useAppStore } from '@/store'
import { buildChartSeries } from '@/utils/scoring'
import RoundEntry   from '@/components/RoundEntry.vue'
import RoundHistory from '@/components/RoundHistory.vue'

const route   = useRoute()
const store   = useAppStore()
const gameId  = route.params.id

const loading         = ref(true)
const saving          = ref(false)
const game            = ref(null)
const leaderboard     = ref([])
const rounds          = ref([])
const roundDialog     = ref(false)
const completeDialog  = ref(false)
const lastRoundMode   = ref(false)
const winnerDialog    = ref(false)

function initials(n = '') { return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }
function fmtDate(d)       { return new Date(d).toLocaleDateString() }

const chartData = computed(() => {
  if (!game.value || !rounds.value.length) return { series: [], colors: [], categories: [] }
  return buildChartSeries(game.value.players || [], rounds.value)
})

const chartOptions = computed(() => ({
  chart:  { background: 'transparent', toolbar: { show: false }, animations: { enabled: true } },
  theme:  { mode: 'dark' },
  colors: chartData.value.colors,
  stroke: { curve: 'smooth', width: 2.5 },
  markers: { size: 4 },
  xaxis:  { categories: chartData.value.categories, labels: { style: { colors: '#9CA3AF' } } },
  yaxis:  { labels: { style: { colors: '#9CA3AF' }, formatter: v => (v >= 0 ? `+${v}` : `${v}`) } },
  grid:   { borderColor: '#1B3320' },
  legend: { labels: { colors: '#C4E8CA' } },
  tooltip: { theme: 'dark' },
}))

async function fetchAll() {
  loading.value = true
  try {
    const [gRes, lRes, rRes] = await Promise.all([
      gamesAPI.get(gameId),
      gamesAPI.leaderboard(gameId),
      gamesAPI.rounds(gameId),
    ])
    game.value        = gRes.data
    leaderboard.value = lRes.data
    rounds.value      = rRes.data
  } finally { loading.value = false }
}

async function onRoundSaved() {
  roundDialog.value = false
  if (lastRoundMode.value) {
    lastRoundMode.value = false
    store.notify('Last round recorded! Finalising scores...')
    await fetchAll()
    await completeGame(true)
  } else {
    store.notify('Round recorded!')
    await fetchAll()
  }
}

async function onRoundDeleted() {
  store.notify('Round deleted and scores reversed', 'warning')
  await fetchAll()
}

async function completeGame(fromLastRound = false) {
  saving.value = true
  try {
    await gamesAPI.complete(gameId)
    if (!fromLastRound) {
      store.notify('🏆 Game completed!')
      completeDialog.value = false
    }
    await fetchAll()
    winnerDialog.value = true
  } finally { saving.value = false }
}

onMounted(fetchAll)
</script>

<style scoped>
.leader-row { background: rgba(74,222,128,0.05); }
.rank-badge {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
}
</style>
