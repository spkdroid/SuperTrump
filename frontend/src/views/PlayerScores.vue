<template>
  <v-container fluid class="pa-0" style="min-height:100vh; background:var(--v-theme-background);">

    <!-- ── Loading ─────────────────────────────────────────── -->
    <div v-if="loading" class="d-flex align-center justify-center" style="height:100vh;">
      <div class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" width="5" />
        <div class="mt-4 text-medium-emphasis">Loading scores…</div>
      </div>
    </div>

    <!-- ── Focus mode (single player fullscreen) ──────────── -->
    <transition name="focus-slide">
      <div v-if="focusPlayer" class="focus-overlay" @click.self="focusPlayer = null">
        <div class="focus-card" :style="`--player-color:${focusPlayer.avatar_color}`">

          <!-- close -->
          <v-btn icon="mdi-close" variant="text" color="white"
            class="focus-close" @click="focusPlayer = null" />

          <!-- Rank badge -->
          <div class="focus-rank">
            <span class="rank-emoji">{{ ['🥇','🥈','🥉'][focusRank] ?? `#${focusRank + 1}` }}</span>
          </div>

          <!-- Avatar -->
          <div class="focus-avatar-wrap">
            <div class="focus-glow-ring">
              <v-avatar :color="focusPlayer.avatar_color" size="120" rounded="xl">
                <span class="font-weight-black" style="font-size:2.4rem;color:rgba(0,0,0,0.72);">
                  {{ initials(focusPlayer.player_name) }}
                </span>
              </v-avatar>
            </div>
          </div>

          <!-- Name -->
          <div class="focus-name">{{ focusPlayer.player_name }}</div>

          <!-- Score -->
          <div class="focus-score" :class="focusPlayer.current_score >= 0 ? 'score-pos' : 'score-neg'">
            {{ focusPlayer.current_score >= 0 ? '+' : '' }}{{ focusPlayer.current_score }}
          </div>
          <div class="focus-score-label">TOTAL SCORE</div>

          <!-- Stats row -->
          <div class="focus-stats">
            <div class="focus-stat-box">
              <div class="focus-stat-val">{{ focusPlayer.rounds_played }}</div>
              <div class="focus-stat-lbl">Rounds</div>
            </div>
            <div class="focus-stat-box">
              <div class="focus-stat-val">{{ focusPlayer.times_bidder }}</div>
              <div class="focus-stat-lbl">As Bidder</div>
            </div>
            <div class="focus-stat-box">
              <div class="focus-stat-val text-success">{{ focusPlayer.bids_won }}</div>
              <div class="focus-stat-lbl">Bids Won</div>
            </div>
            <div class="focus-stat-box">
              <div class="focus-stat-val"
                :class="bidWinPct(focusPlayer) >= 50 ? 'text-success' : 'text-error'">
                {{ bidWinPct(focusPlayer) }}%
              </div>
              <div class="focus-stat-lbl">Bid Win%</div>
            </div>
          </div>

          <!-- Round history for this player -->
          <div v-if="playerRoundHistory(focusPlayer.player_id).length" class="focus-history">
            <div class="focus-history-title">ROUND HISTORY</div>
            <div class="focus-history-scroll">
              <div
                v-for="rh in playerRoundHistory(focusPlayer.player_id)"
                :key="rh.round_id"
                class="focus-history-row"
                :class="rh.score >= 0 ? 'rh-win' : 'rh-lose'"
              >
                <span class="rh-round">R{{ rh.round_number }}</span>
                <span class="rh-role">{{ rh.role }}</span>
                <span class="rh-bid">Bid {{ rh.bid_amount }}</span>
                <span class="rh-score" :class="rh.score >= 0 ? 'text-success' : 'text-error'">
                  {{ rh.score >= 0 ? '+' : '' }}{{ rh.score }}
                </span>
              </div>
            </div>
          </div>

          <!-- Game name label -->
          <div class="focus-game-name">{{ game?.name }} · Round {{ game?.current_round }}</div>
        </div>
      </div>
    </transition>

    <!-- ── Scoreboard ──────────────────────────────────────── -->
    <template v-if="!loading && game">
      <!-- Header bar -->
      <div class="scores-header">
        <v-btn icon="mdi-arrow-left" variant="text" color="primary"
          @click="$router.push(`/games/${gameId}`)" />
        <div class="flex-grow-1">
          <div class="d-flex align-center gap-2 flex-wrap">
            <span class="text-h5 font-weight-bold text-primary">{{ game.name }}</span>
            <v-chip :color="game.status === 'active' ? 'success' : 'grey'" label size="x-small">
              {{ game.status === 'active' ? 'LIVE' : 'COMPLETED' }}
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis">
            Round {{ game.current_round }} · {{ leaderboard.length }} players
            <span v-if="lastRefresh"> · Updated {{ lastRefresh }}</span>
          </div>
        </div>

        <!-- Auto-refresh toggle -->
        <div class="d-flex align-center gap-2">
          <v-btn
            :color="autoRefresh ? 'primary' : 'grey'"
            :variant="autoRefresh ? 'tonal' : 'text'"
            size="small"
            rounded="pill"
            :prepend-icon="autoRefresh ? 'mdi-refresh-auto' : 'mdi-refresh'"
            @click="toggleAutoRefresh"
          >
            {{ autoRefresh ? 'Auto' : 'Refresh' }}
          </v-btn>
          <v-btn icon="mdi-refresh" size="small" variant="text" color="primary"
            :loading="refreshing" @click="doRefresh" />
        </div>
      </div>

      <!-- Leading player hero banner -->
      <div v-if="leaderboard[0]" class="leader-hero">
        <div class="lh-left">
          <div class="lh-crown">👑</div>
          <v-avatar :color="leaderboard[0].avatar_color" size="52" rounded="xl">
            <span class="font-weight-black" style="font-size:1.1rem;color:rgba(0,0,0,0.72)">
              {{ initials(leaderboard[0].player_name) }}
            </span>
          </v-avatar>
          <div>
            <div class="lh-name">{{ leaderboard[0].player_name }}</div>
            <div class="text-caption text-medium-emphasis">Leading · {{ leaderboard[0].rounds_played }} rounds</div>
          </div>
        </div>
        <div class="lh-score" :class="leaderboard[0].current_score >= 0 ? 'lhs-pos' : 'lhs-neg'">
          {{ leaderboard[0].current_score >= 0 ? '+' : '' }}{{ leaderboard[0].current_score }}
        </div>
      </div>

      <!-- Player cards grid -->
      <div class="scores-grid pa-4">
        <div
          v-for="(entry, idx) in leaderboard"
          :key="entry.player_id"
          class="player-score-card"
          :class="{ 'psc-leader': idx === 0 }"
          :style="`--pcolor:${entry.avatar_color}`"
          @click="openFocus(entry, idx)"
        >
          <!-- rank -->
          <div class="psc-rank">
            <span v-if="idx < 3" class="rank-emoji-sm">{{ ['🥇','🥈','🥉'][idx] }}</span>
            <span v-else class="text-caption text-medium-emphasis font-weight-bold">#{{ idx+1 }}</span>
          </div>

          <!-- avatar + name -->
          <div class="psc-identity">
            <v-avatar :color="entry.avatar_color" size="44" rounded="xl">
              <span class="font-weight-black" style="font-size:13px;color:rgba(0,0,0,0.72)">
                {{ initials(entry.player_name) }}
              </span>
            </v-avatar>
            <div class="psc-name-wrap">
              <div class="psc-name">{{ entry.player_name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ entry.rounds_played }}r · {{ entry.times_bidder }} bids
                <span v-if="entry.times_bidder > 0">({{ bidWinPct(entry) }}%)</span>
              </div>
            </div>
          </div>

          <!-- trend arrow from last round -->
          <div class="psc-trend">
            <v-icon
              v-if="lastRoundDelta(entry.player_id) > 0"
              color="success" size="18">mdi-trending-up</v-icon>
            <v-icon
              v-else-if="lastRoundDelta(entry.player_id) < 0"
              color="error" size="18">mdi-trending-down</v-icon>
            <span v-if="lastRoundDelta(entry.player_id) !== null"
              class="trend-delta text-caption"
              :class="lastRoundDelta(entry.player_id) >= 0 ? 'text-success' : 'text-error'">
              {{ lastRoundDelta(entry.player_id) >= 0 ? '+' : '' }}{{ lastRoundDelta(entry.player_id) }}
            </span>
          </div>

          <!-- score -->
          <div class="psc-score" :class="entry.current_score >= 0 ? 'score-pos' : 'score-neg'">
            {{ entry.current_score >= 0 ? '+' : '' }}{{ entry.current_score }}
          </div>

          <!-- tap hint -->
          <v-icon class="psc-expand" size="14" color="grey">mdi-fullscreen</v-icon>
        </div>
      </div>

      <!-- Score sparkline per player -->
      <div class="pa-4 pt-0">
        <v-card color="surface" rounded="xl" elevation="0"
          style="border:1px solid rgba(74,222,128,0.1)">
          <v-card-title class="pa-4 pb-2 d-flex align-center">
            <v-icon color="info" size="18" class="mr-2">mdi-chart-line</v-icon>
            Score Progression
          </v-card-title>
          <v-card-text class="pa-3 pt-0">
            <apexchart
              v-if="chartData.series.length && rounds.length"
              type="line"
              height="220"
              :options="chartOptions"
              :series="chartData.series"
            />
            <div v-else class="text-center py-8 text-medium-emphasis text-caption">
              Chart appears after the first round
            </div>
          </v-card-text>
        </v-card>
      </div>

    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { gamesAPI } from '@/api'
import { buildChartSeries } from '@/utils/scoring'

const route  = useRoute()
const gameId = route.params.id

const loading     = ref(true)
const refreshing  = ref(false)
const game        = ref(null)
const leaderboard = ref([])
const rounds      = ref([])
const focusPlayer = ref(null)
const focusRank   = ref(0)
const lastRefresh = ref(null)
const autoRefresh = ref(true)
let   refreshTimer = null

function initials(n = '') { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }
function bidWinPct(e) {
  return e.times_bidder > 0 ? Math.round(e.bids_won / e.times_bidder * 100) : 0
}

// Per-player round-by-round score history built from rounds data
function playerRoundHistory(playerId) {
  const history = []
  for (const r of rounds.value) {
    const participant = (r.participants || []).find(p => p.player_id === playerId)
    if (participant) {
      history.push({
        round_id:     r.id,
        round_number: r.round_number,
        bid_amount:   r.bid_amount,
        role:         participant.role,
        score:        participant.score,
      })
    }
  }
  return history.sort((a, b) => b.round_number - a.round_number)
}

// Delta from last round for trend arrow
function lastRoundDelta(playerId) {
  if (!rounds.value.length) return null
  const lastRound = rounds.value[rounds.value.length - 1]
  const p = (lastRound?.participants || []).find(p => p.player_id === playerId)
  return p ? p.score : null
}

function openFocus(entry, idx) {
  focusPlayer.value = entry
  focusRank.value   = idx
}

// Chart
const chartData = computed(() => {
  if (!game.value || !rounds.value.length) return { series: [], colors: [], categories: [] }
  return buildChartSeries(game.value.players || [], rounds.value)
})

const chartOptions = computed(() => ({
  chart:   { background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
  theme:   { mode: 'dark' },
  colors:  chartData.value.colors,
  stroke:  { curve: 'smooth', width: 2 },
  markers: { size: 3 },
  xaxis:   { categories: chartData.value.categories, labels: { style: { colors: '#9CA3AF', fontSize: '10px' } } },
  yaxis:   { labels: { style: { colors: '#9CA3AF', fontSize: '10px' }, formatter: v => (v >= 0 ? `+${v}` : `${v}`) } },
  grid:    { borderColor: '#1B3320' },
  legend:  { labels: { colors: '#C4E8CA' }, fontSize: '11px' },
  tooltip: { theme: 'dark' },
}))

async function fetchAll(quiet = false) {
  if (!quiet) loading.value = true
  else refreshing.value = true
  try {
    const [gRes, lRes, rRes] = await Promise.all([
      gamesAPI.get(gameId),
      gamesAPI.leaderboard(gameId),
      gamesAPI.rounds(gameId),
    ])
    game.value        = gRes.data
    leaderboard.value = lRes.data
    rounds.value      = rRes.data
    lastRefresh.value = new Date().toLocaleTimeString()

    // Update focusPlayer if it was open
    if (focusPlayer.value) {
      const updated = lRes.data.find(e => e.player_id === focusPlayer.value.player_id)
      if (updated) {
        focusPlayer.value = updated
        focusRank.value   = lRes.data.indexOf(updated)
      }
    }
  } finally {
    loading.value    = false
    refreshing.value = false
  }
}

async function doRefresh() { await fetchAll(true) }

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => fetchAll(true), 12000)
}
function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
}
function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  autoRefresh.value ? startAutoRefresh() : stopAutoRefresh()
}

onMounted(async () => {
  await fetchAll()
  if (autoRefresh.value) startAutoRefresh()
})
onUnmounted(stopAutoRefresh)
</script>

<style scoped>
/* ── Header ─────────────────────────────────────────────── */
.scores-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px 10px;
  background: rgba(17,26,17,0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(74,222,128,0.1);
  position: sticky; top: 0; z-index: 10;
}

/* ── Leader hero ─────────────────────────────────────────── */
.leader-hero {
  display: flex; align-items: center; justify-content: space-between;
  margin: 12px 16px 4px;
  padding: 14px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(252,211,77,0.1) 0%, rgba(74,222,128,0.07) 100%);
  border: 1px solid rgba(252,211,77,0.2);
}
.lh-left   { display: flex; align-items: center; gap: 12px; }
.lh-crown  { font-size: 26px; line-height: 1; }
.lh-name   { font-size: 1rem; font-weight: 700; color: #fff; }
.lh-score  { font-size: 2rem; font-weight: 900; letter-spacing: -1px; }
.lhs-pos   { color: #4ADE80; text-shadow: 0 0 16px rgba(74,222,128,0.5); }
.lhs-neg   { color: #F87171; text-shadow: 0 0 16px rgba(248,113,113,0.5); }

/* ── Player score cards grid ─────────────────────────────── */
.scores-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 600px)  { .scores-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 960px)  { .scores-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1280px) { .scores-grid { grid-template-columns: repeat(4, 1fr); } }

.player-score-card {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1.5px solid rgba(74,222,128,0.1);
  background: rgba(17,26,17,0.7);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  overflow: hidden;
}
.player-score-card::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--pcolor);
  border-radius: 16px 0 0 16px;
}
.player-score-card:hover {
  transform: translateY(-3px);
  border-color: rgba(74,222,128,0.25);
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}
.psc-leader {
  border-color: rgba(252,211,77,0.3) !important;
  background: rgba(252,211,77,0.04) !important;
}

.psc-rank       { width: 28px; text-align: center; flex-shrink: 0; }
.rank-emoji-sm  { font-size: 18px; line-height: 1; }
.psc-identity   { display: flex; align-items: center; gap: 10px; flex-grow: 1; min-width: 0; }
.psc-name-wrap  { min-width: 0; }
.psc-name       { font-size: 0.9rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.psc-trend      { display: flex; flex-direction: column; align-items: center; width: 32px; flex-shrink: 0; }
.trend-delta    { font-size: 10px; font-weight: 700; line-height: 1; margin-top: 1px; }
.psc-score      { font-size: 1.5rem; font-weight: 900; letter-spacing: -1px; text-align: right; flex-shrink: 0; width: 72px; }
.psc-expand     { position: absolute; bottom: 6px; right: 6px; opacity: 0.3; }

.score-pos { color: #4ADE80; }
.score-neg { color: #F87171; }

/* ── Focus overlay ───────────────────────────────────────── */
.focus-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.focus-card {
  position: relative;
  width: 100%; max-width: 420px; max-height: 90vh;
  overflow-y: auto;
  border-radius: 24px;
  background: linear-gradient(160deg, #0d1a0e 0%, #091018 60%, #160a22 100%);
  border: 2px solid var(--player-color);
  box-shadow: 0 0 60px rgba(0,0,0,0.7), 0 0 30px color-mix(in srgb, var(--player-color) 25%, transparent);
  padding: 28px 24px 24px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  animation: focus-in 0.3s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes focus-in {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.focus-close {
  position: absolute; top: 12px; right: 12px;
}
.focus-rank      { font-size: 2.2rem; line-height: 1; }
.rank-emoji      { font-size: 2.2rem; }
.focus-avatar-wrap { }
.focus-glow-ring {
  padding: 4px; border-radius: 20px;
  background: linear-gradient(135deg, var(--player-color), #4ADE80, #60A5FA);
}
.focus-name {
  font-size: 1.8rem; font-weight: 800; color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
  line-height: 1.1;
}
.focus-score {
  font-size: 4.5rem; font-weight: 900; letter-spacing: -3px; line-height: 1;
}
.focus-score-label {
  font-size: 11px; letter-spacing: 3px; color: rgba(255,255,255,0.4); margin-top: -8px;
}
.focus-stats {
  display: grid; grid-template-columns: repeat(4,1fr);
  gap: 8px; width: 100%;
}
.focus-stat-box {
  background: rgba(255,255,255,0.05);
  border-radius: 10px; padding: 8px 4px;
}
.focus-stat-val { font-size: 1.15rem; font-weight: 800; color: #fff; }
.focus-stat-lbl { font-size: 9px; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; }

/* Round history inside focus */
.focus-history { width: 100%; text-align: left; }
.focus-history-title {
  font-size: 10px; letter-spacing: 3px; color: rgba(255,255,255,0.35);
  margin-bottom: 8px; padding-left: 2px;
}
.focus-history-scroll {
  display: flex; flex-direction: column; gap: 5px;
  max-height: 200px; overflow-y: auto;
}
.focus-history-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  font-size: 12px;
}
.rh-win  { background: rgba(74,222,128,0.06);  border: 1px solid rgba(74,222,128,0.12); }
.rh-lose { background: rgba(248,113,113,0.06); border: 1px solid rgba(248,113,113,0.12); }
.rh-round { font-weight: 700; color: rgba(255,255,255,0.5); width: 24px; }
.rh-role  { font-size: 10px; color: rgba(255,255,255,0.4); width: 48px; text-transform: capitalize; }
.rh-bid   { color: rgba(255,255,255,0.5); flex-grow: 1; }
.rh-score { font-weight: 800; font-size: 13px; }

.focus-game-name {
  font-size: 10px; letter-spacing: 2px; color: rgba(255,255,255,0.25);
  text-transform: uppercase;
}

/* Slide transition */
.focus-slide-enter-active, .focus-slide-leave-active { transition: opacity 0.2s ease; }
.focus-slide-enter-from, .focus-slide-leave-to { opacity: 0; }
</style>
