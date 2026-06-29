<template>
  <v-container fluid class="pa-0 live-scores-root">

    <!-- ── Loading ─────────────────────────────────────────── -->
    <div v-if="loading" class="d-flex align-center justify-center full-height-center">
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
          <v-btn icon="mdi-close" variant="text" color="primary"
            class="focus-close" @click="focusPlayer = null" />

          <!-- Rank badge -->
          <div class="focus-rank">
            <span class="rank-emoji">{{ ['🥇','🥈','🥉'][focusRank] ?? `#${focusRank + 1}` }}</span>
          </div>

          <!-- Avatar -->
          <div class="focus-avatar-wrap">
            <div class="focus-glow-ring">
              <v-avatar :color="focusPlayer.avatar_color" size="120" rounded="xl">
                <span class="focus-avatar-initial">
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
            <span class="st-avatar-initial-lg">
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
          class="playing-card"
          :class="{ 'pcard-leader': idx === 0 }"
          :style="`--pcolor:${entry.avatar_color}; --suit-color:${SUIT_COLORS[idx % 4]}`"
          @click="openFocus(entry, idx)"
        >
          <!-- Top-left corner -->
          <div class="pc-corner pc-tl">
            <div class="pc-corner-rank">{{ cornerRank(idx) }}</div>
            <div class="pc-corner-suit">{{ SUITS[idx % 4] }}</div>
          </div>

          <!-- Bottom-right corner (rotated 180°) -->
          <div class="pc-corner pc-br">
            <div class="pc-corner-rank">{{ cornerRank(idx) }}</div>
            <div class="pc-corner-suit">{{ SUITS[idx % 4] }}</div>
          </div>

          <!-- Card body -->
          <div class="pc-body">
            <!-- Large watermark suit symbol -->
            <div class="pc-suit-watermark">{{ SUITS[idx % 4] }}</div>

            <!-- Avatar -->
            <v-avatar :color="entry.avatar_color" size="56" rounded="xl" class="pc-avatar">
              <span class="st-avatar-initial-md">
                {{ initials(entry.player_name) }}
              </span>
            </v-avatar>

            <!-- Name -->
            <div class="pc-name">{{ entry.player_name }}</div>

            <!-- Score -->
            <div class="pc-score" :class="entry.current_score >= 0 ? 'score-pos' : 'score-neg'">
              {{ entry.current_score >= 0 ? '+' : '' }}{{ entry.current_score }}
            </div>

            <!-- Last round trend -->
            <div v-if="lastRoundDelta(entry.player_id) !== null" class="pc-trend">
              <v-icon
                :color="lastRoundDelta(entry.player_id) >= 0 ? 'success' : 'error'"
                size="13"
              >{{ lastRoundDelta(entry.player_id) >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
              <span
                class="font-weight-bold ml-1"
                :class="lastRoundDelta(entry.player_id) >= 0 ? 'text-success' : 'text-error'"
              >{{ lastRoundDelta(entry.player_id) >= 0 ? '+' : '' }}{{ lastRoundDelta(entry.player_id) }}</span>
            </div>

            <!-- Mini stats -->
            <div class="pc-stats">
              <div class="pc-stat">
                <span class="pc-stat-val">{{ entry.rounds_played }}</span>
                <span class="pc-stat-lbl">Rounds</span>
              </div>
              <div class="pc-stat">
                <span class="pc-stat-val">{{ entry.times_bidder }}</span>
                <span class="pc-stat-lbl">Bids</span>
              </div>
              <div v-if="entry.times_bidder > 0" class="pc-stat">
                <span class="pc-stat-val" :class="bidWinPct(entry) >= 50 ? 'text-success' : 'text-error'">{{ bidWinPct(entry) }}%</span>
                <span class="pc-stat-lbl">Bid%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Score sparkline per player -->
      <div class="pa-4 pt-0">
        <v-card color="surface" rounded="xl" elevation="0" class="st-panel">
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

const SUITS       = ['♠', '♥', '♦', '♣']
const SUIT_COLORS = ['#1D4ED8', '#DC2626', '#0EA5E9', '#2563EB']
function cornerRank(idx) {
  const labels = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
  return labels[idx] ?? String(idx + 1)
}

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
  theme:   { mode: 'light' },
  colors:  chartData.value.colors,
  stroke:  { curve: 'smooth', width: 2 },
  markers: { size: 3 },
  xaxis:   { categories: chartData.value.categories, labels: { style: { colors: '#64748B', fontSize: '10px' } } },
  yaxis:   { labels: { style: { colors: '#64748B', fontSize: '10px' }, formatter: v => (v >= 0 ? `+${v}` : `${v}`) } },
  grid:    { borderColor: '#D6E6FF' },
  legend:  { labels: { colors: '#1E3A8A' }, fontSize: '11px' },
  tooltip: { theme: 'light' },
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
.live-scores-root {
  min-height: 100vh;
  background: transparent;
}

.full-height-center {
  height: 100vh;
}

.scores-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--st-panel-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.leader-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 16px 4px;
  padding: 14px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(var(--st-primary-rgb), 0.08) 0%, rgba(var(--st-secondary-rgb), 0.07) 100%);
  border: 1px solid rgba(var(--st-primary-rgb), 0.2);
}

.lh-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lh-crown {
  font-size: 26px;
  line-height: 1;
}

.lh-name {
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.lh-score {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -1px;
}

.lhs-pos {
  color: #16a34a;
  text-shadow: 0 0 12px rgba(22, 163, 74, 0.24);
}

.lhs-neg {
  color: #dc2626;
  text-shadow: 0 0 12px rgba(220, 38, 38, 0.24);
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 600px) {
  .scores-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
}

@media (min-width: 960px) {
  .scores-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 1280px) {
  .scores-grid { grid-template-columns: repeat(5, 1fr); }
}

.playing-card {
  position: relative;
  aspect-ratio: 5 / 7;
  border-radius: 16px;
  background: linear-gradient(170deg, #ffffff 0%, #f8fbff 56%, #edf4ff 100%);
  border: 1.5px solid color-mix(in srgb, var(--suit-color) 30%, #dbeafe);
  box-shadow:
    0 8px 18px rgba(37, 99, 235, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.22s cubic-bezier(.34, 1.56, .64, 1), box-shadow 0.22s;
  display: flex;
  flex-direction: column;
}

.playing-card:hover {
  transform: translateY(-8px) rotate(-1deg);
  box-shadow:
    0 20px 34px rgba(37, 99, 235, 0.22),
    0 0 20px color-mix(in srgb, var(--suit-color) 20%, transparent);
}

.pcard-leader {
  border-color: rgba(var(--st-primary-rgb), 0.46) !important;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2) !important;
}

.pcard-leader:hover {
  box-shadow: 0 24px 38px rgba(37, 99, 235, 0.28) !important;
}

.pc-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  z-index: 2;
  pointer-events: none;
}

.pc-tl { top: 10px; left: 11px; }
.pc-br { bottom: 10px; right: 11px; transform: rotate(180deg); }

.pc-corner-rank {
  font-size: 1.05rem;
  font-weight: 900;
  line-height: 1;
  color: var(--suit-color);
  text-shadow: 0 0 10px color-mix(in srgb, var(--suit-color) 30%, transparent);
}

.pc-corner-suit {
  font-size: 0.8rem;
  line-height: 1.1;
  color: var(--suit-color);
  opacity: 0.9;
}

.pc-body {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 10px 14px;
  gap: 5px;
  z-index: 1;
}

.pc-suit-watermark {
  position: absolute;
  font-size: 6.5rem;
  line-height: 1;
  color: var(--suit-color);
  opacity: 0.08;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
}

.pc-avatar {
  flex-shrink: 0;
  z-index: 1;
}

.pc-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  text-align: center;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.25;
  word-break: break-word;
  max-width: 100%;
  z-index: 1;
}

.pc-score {
  font-size: 1.9rem;
  font-weight: 900;
  letter-spacing: -1.5px;
  line-height: 1;
  z-index: 1;
}

.score-pos {
  color: #16a34a;
  text-shadow: 0 0 10px rgba(22, 163, 74, 0.22);
}

.score-neg {
  color: #dc2626;
  text-shadow: 0 0 10px rgba(220, 38, 38, 0.2);
}

.pc-trend {
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  z-index: 1;
}

.pc-stats {
  display: flex;
  gap: 5px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 4px;
  z-index: 1;
}

.pc-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(var(--st-primary-rgb), 0.08);
  border-radius: 7px;
  padding: 4px 7px;
  min-width: 34px;
}

.pc-stat-val {
  font-size: 0.72rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
}

.pc-stat-lbl {
  font-size: 7px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.focus-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.focus-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 24px;
  background: linear-gradient(160deg, #ffffff 0%, #f6faff 60%, #eaf2ff 100%);
  border: 2px solid var(--player-color);
  box-shadow: 0 0 60px rgba(37, 99, 235, 0.2), 0 0 24px color-mix(in srgb, var(--player-color) 24%, transparent);
  padding: 28px 24px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: focus-in 0.3s cubic-bezier(.34, 1.56, .64, 1) both;
}

@keyframes focus-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.focus-close {
  position: absolute;
  top: 12px;
  right: 12px;
}

.focus-rank {
  font-size: 2.2rem;
  line-height: 1;
}

.rank-emoji {
  font-size: 2.2rem;
}

.focus-glow-ring {
  padding: 4px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--player-color), #2563eb, #0ea5e9);
}

.focus-avatar-initial {
  font-size: 2.4rem;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.72);
}

.focus-name {
  font-size: 1.8rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
  text-shadow: 0 2px 10px rgba(37, 99, 235, 0.15);
  line-height: 1.1;
}

.focus-score {
  font-size: 4.5rem;
  font-weight: 900;
  letter-spacing: -3px;
  line-height: 1;
}

.focus-score-label {
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(var(--v-theme-on-surface), 0.42);
  margin-top: -8px;
}

.focus-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}

.focus-stat-box {
  background: rgba(var(--st-primary-rgb), 0.08);
  border-radius: 10px;
  padding: 8px 4px;
}

.focus-stat-val {
  font-size: 1.15rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
}

.focus-stat-lbl {
  font-size: 9px;
  color: rgba(var(--v-theme-on-surface), 0.46);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.focus-history {
  width: 100%;
  text-align: left;
}

.focus-history-title {
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-bottom: 8px;
  padding-left: 2px;
}

.focus-history-scroll {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 200px;
  overflow-y: auto;
}

.focus-history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.rh-win {
  background: rgba(22, 163, 74, 0.08);
  border: 1px solid rgba(22, 163, 74, 0.16);
}

.rh-lose {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.16);
}

.rh-round {
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.55);
  width: 24px;
}

.rh-role {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  width: 48px;
  text-transform: capitalize;
}

.rh-bid {
  color: rgba(var(--v-theme-on-surface), 0.55);
  flex-grow: 1;
}

.rh-score {
  font-weight: 800;
  font-size: 13px;
}

.focus-game-name {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(var(--v-theme-on-surface), 0.34);
  text-transform: uppercase;
}

.focus-slide-enter-active,
.focus-slide-leave-active {
  transition: opacity 0.2s ease;
}

.focus-slide-enter-from,
.focus-slide-leave-to {
  opacity: 0;
}
</style>
