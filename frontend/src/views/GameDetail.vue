<template>
  <v-container fluid class="pa-6">
    <div class="st-page-shell">
      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="56" />
      </div>

      <template v-else-if="game">
        <!-- ── Header ───────────────────────────────────────── -->
        <div class="st-header-row align-start gap-3 flex-wrap">
          <v-btn icon="mdi-arrow-left" variant="text" @click="$router.push('/games')" />
          <div class="flex-grow-1">
            <div class="d-flex align-center gap-2 flex-wrap">
              <h1 class="st-page-title">{{ game.name }}</h1>
              <v-chip
                :color="game.status === 'active' ? 'success' : 'grey'"
                label
                size="small"
              >
                {{ game.status === 'active' ? 'LIVE' : 'COMPLETED' }}
              </v-chip>
            </div>
            <p class="st-page-subtitle">
              {{ game.num_players }} players · {{ rounds.length }} rounds played ·
              Started {{ fmtDate(game.created_at) }} · Owner {{ game.owner_username || 'admin' }}
            </p>
          </div>
          <div class="d-flex gap-2 align-center flex-wrap">
            <v-btn
              v-if="game.status === 'active'"
              color="info"
              variant="tonal"
              prepend-icon="mdi-scoreboard"
              rounded="lg"
              :to="`/games/${gameId}/live`"
            >
              Live Scores
            </v-btn>
            <v-btn
              v-if="game.status === 'active' && canManageGame"
              color="primary"
              prepend-icon="mdi-plus"
              rounded="lg"
              @click="lastRoundMode = false; roundDialog = true"
            >
              Add Round
            </v-btn>
            <v-btn
              v-if="game.status === 'active' && canManageGame"
              color="warning"
              prepend-icon="mdi-flag-triangle"
              rounded="lg"
              @click="lastRoundMode = true; roundDialog = true"
            >
              Last Round
            </v-btn>
            <v-btn
              v-if="game.status === 'active' && canManageGame"
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

        <v-alert
          v-if="game.status === 'active' && !canManageGame"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          border="start"
        >
          You can view this game, but only the owner or admin can add rounds, undo rounds, or end it.
        </v-alert>

        <v-row v-if="gameInsights.length" class="mb-4 game-insight-grid">
          <v-col
            v-for="insight in gameInsights"
            :key="insight.key"
            cols="12"
            sm="6"
            lg="3"
          >
            <v-card
              color="surface"
              rounded="xl"
              elevation="0"
              class="st-panel st-lift insight-card"
              :class="`insight-${insight.tone}`"
            >
              <div class="insight-icon-wrap">
                <v-icon :color="insight.color" size="22">{{ insight.icon }}</v-icon>
              </div>
              <div class="insight-body">
                <div class="insight-label">{{ insight.label }}</div>
                <div class="insight-value">{{ insight.value }}</div>
                <div class="insight-detail">{{ insight.detail }}</div>
              </div>
            </v-card>
          </v-col>
        </v-row>

      <!-- ── Leaderboard + Chart ──────────────────────────── -->
      <v-row class="mb-4">
        <!-- Live Leaderboard -->
        <v-col cols="12" md="5">
          <v-card color="surface" rounded="xl" elevation="0" class="st-panel st-panel-fill">
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
                  <span class="st-avatar-initial-md">
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
                  <div v-if="rounds.length" class="standings-microline">
                    <v-icon size="13" :color="playerMomentum(entry.player_id).color">
                      {{ playerMomentum(entry.player_id).icon }}
                    </v-icon>
                    <span>{{ playerMomentum(entry.player_id).label }}</span>
                    <span v-if="idx > 0" class="micro-separator">|</span>
                    <span v-if="idx > 0">{{ pointsBehind(entry) }} back</span>
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
          <v-card color="surface" rounded="xl" elevation="0" class="st-panel st-panel-fill">
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
        <v-row v-if="rounds.length" class="mb-4">
          <v-col cols="12" md="8">
            <v-card color="surface" rounded="xl" elevation="0" class="st-panel st-panel-fill">
              <v-card-title class="pa-5 pb-3 d-flex align-center">
                <v-icon color="success" class="mr-2">mdi-chart-timeline-variant</v-icon>
                Table Momentum
                <v-chip size="x-small" color="success" variant="tonal" label class="ml-2">
                  Last {{ momentumWindow }} rounds
                </v-chip>
              </v-card-title>
              <v-card-text class="pt-0">
                <div
                  v-for="entry in leaderboard"
                  :key="`momentum-${entry.player_id}`"
                  class="momentum-row"
                >
                  <div class="d-flex align-center gap-2 momentum-head">
                    <v-avatar :color="entry.avatar_color" size="26" rounded="lg">
                      <span class="st-avatar-initial-xs">
                        {{ initials(entry.player_name) }}
                      </span>
                    </v-avatar>
                    <div class="momentum-name">{{ entry.player_name }}</div>
                    <v-spacer />
                    <v-chip
                      :color="playerMomentum(entry.player_id).color"
                      size="x-small"
                      label
                    >
                      {{ signed(playerMomentum(entry.player_id).value) }}
                    </v-chip>
                  </div>
                  <v-progress-linear
                    :model-value="momentumProgress(entry)"
                    :color="playerMomentum(entry.player_id).color"
                    height="8"
                    rounded
                    bg-color="surface-variant"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card color="surface" rounded="xl" elevation="0" class="st-panel st-panel-fill">
              <v-card-title class="pa-5 pb-3 d-flex align-center">
                <v-icon color="warning" class="mr-2">mdi-medal-outline</v-icon>
                Game Awards
              </v-card-title>
              <v-card-text class="pt-0">
                <div
                  v-for="award in gameAwards"
                  :key="award.key"
                  class="award-row"
                >
                  <v-avatar color="surface-variant" size="34" rounded="lg" class="award-icon">
                    <v-icon :color="award.color" size="19">{{ award.icon }}</v-icon>
                  </v-avatar>
                  <div class="award-body">
                    <div class="award-title">{{ award.title }}</div>
                    <div class="award-player">{{ award.playerName }}</div>
                    <div class="award-detail">{{ award.detail }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- ── Replay Timeline ─────────────────────────────── -->
        <v-row class="mb-4" v-if="replayTimeline.length">
          <v-col cols="12">
            <v-card color="surface" rounded="xl" elevation="0" class="st-panel st-panel-fill">
              <v-card-title class="pa-5 pb-3 d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-playlist-play</v-icon>
                Replay Timeline
                <v-chip size="x-small" color="primary" variant="tonal" label class="ml-2">
                  Round-by-round
                </v-chip>
              </v-card-title>
              <v-card-text class="pt-0">
                <div class="replay-timeline">
                  <div
                    v-for="item in replayTimeline"
                    :key="item.round_id"
                    class="replay-item"
                  >
                    <div class="replay-rail">
                      <div class="replay-dot" :class="item.bid_won ? 'replay-win' : 'replay-loss'">
                        {{ item.round_number }}
                      </div>
                      <div class="replay-line" />
                    </div>
                    <div class="replay-body">
                      <div class="d-flex align-center flex-wrap gap-2 mb-2">
                        <v-chip size="x-small" color="primary" variant="tonal" label>
                          Round {{ item.round_number }}
                        </v-chip>
                        <v-chip size="x-small" :color="item.bid_won ? 'success' : 'error'" label>
                          {{ item.bid_won ? 'Won' : 'Lost' }}
                        </v-chip>
                        <v-chip size="x-small" color="surface-variant" label>
                          {{ BID_TYPE_LABELS[item.bid_type] || item.bid_type }}
                        </v-chip>
                      </div>
                      <div class="text-body-2 font-weight-medium mb-1">
                        {{ item.bidder_name }} bid {{ item.bid_amount }} with
                        {{ item.points_won_by_bidding_team }}/{{ item.bid_amount }} points.
                      </div>
                      <div class="text-caption text-medium-emphasis mb-3">
                        Trump {{ suitLabel(item.trump_suit) }} · Bidder score
                        <span :class="item.bidder_score >= 0 ? 'text-success' : 'text-error'">
                          {{ signed(item.bidder_score) }}
                        </span>
                        <span v-if="item.leading_player"> · Leader: {{ item.leading_player.name }}</span>
                      </div>
                      <div class="d-flex flex-wrap gap-2">
                        <v-chip
                          v-for="participant in item.participants"
                          :key="`${item.round_id}-${participant.player_id}`"
                          size="small"
                          :color="participant.role === 'bidder' ? 'primary' : participant.team === 'bidding' ? 'success' : 'grey'"
                          variant="tonal"
                          label
                        >
                          {{ participant.player_name }} {{ signed(participant.score) }}
                        </v-chip>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <RoundHistory :rounds="rounds" :can-manage="canManageGame" @delete="onRoundDeleted" />
      </template>
    </div>

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

    <!-- 🏆 Winner Announcement — Full-screen animated -->
    <v-dialog v-model="winnerDialog" fullscreen persistent transition="fade-transition">
      <div class="winner-overlay">
        <!-- Confetti -->
        <div class="confetti-container" aria-hidden="true">
          <div v-for="(s, ci) in confettiStyles" :key="ci" class="confetti-piece" :style="s" />
        </div>

        <div class="winner-content">
          <!-- Trophy header -->
          <div class="winner-header">
            <div class="trophy-bounce">🏆</div>
            <h1 class="game-over-text">Game Over!</h1>
            <p class="text-medium-emphasis mb-2 winner-subtitle">{{ game?.name }}</p>
          </div>

          <!-- Winner showcase -->
          <div v-if="leaderboard[0]" class="winner-showcase">
            <div class="glow-ring">
              <v-avatar
                :color="leaderboard[0].avatar_color"
                size="100"
                rounded="xl"
                class="winner-avatar-anim"
              >
                <span class="winner-avatar-initial">
                  {{ initials(leaderboard[0].player_name) }}
                </span>
              </v-avatar>
            </div>
            <div class="winner-name-text">{{ leaderboard[0].player_name }}</div>
            <div class="champion-badge">🥇 CHAMPION</div>
            <div class="winner-score-big">
              {{ leaderboard[0].current_score >= 0 ? '+' : '' }}{{ leaderboard[0].current_score }}
            </div>
            <div v-if="winnerAwards.length" class="winner-awards">
              <v-chip
                v-for="award in winnerAwards"
                :key="`winner-${award.key}`"
                :color="award.color"
                size="small"
                variant="tonal"
                label
                :prepend-icon="award.icon"
              >
                {{ award.title }}
              </v-chip>
            </div>
          </div>

          <!-- Podium (top 3) -->
          <div v-if="leaderboard.length > 1" class="podium-wrap">
            <!-- 2nd -->
            <div v-if="leaderboard[1]" class="podium-slot">
              <v-avatar :color="leaderboard[1].avatar_color" size="46" rounded="lg">
                <span class="st-avatar-initial-lg">{{ initials(leaderboard[1].player_name) }}</span>
              </v-avatar>
              <div class="podium-pname">{{ shortName(leaderboard[1].player_name) }}</div>
              <div class="podium-pscore podium-pscore-silver">{{ leaderboard[1].current_score >= 0 ? '+' : '' }}{{ leaderboard[1].current_score }}</div>
              <div class="podium-block podium-block-silver">🥈</div>
            </div>
            <!-- 1st pedestal -->
            <div class="podium-slot">
              <div class="podium-block podium-block-gold">🥇</div>
            </div>
            <!-- 3rd -->
            <div v-if="leaderboard[2]" class="podium-slot">
              <v-avatar :color="leaderboard[2].avatar_color" size="46" rounded="lg">
                <span class="st-avatar-initial-lg">{{ initials(leaderboard[2].player_name) }}</span>
              </v-avatar>
              <div class="podium-pname">{{ shortName(leaderboard[2].player_name) }}</div>
              <div class="podium-pscore podium-pscore-bronze">{{ leaderboard[2].current_score >= 0 ? '+' : '' }}{{ leaderboard[2].current_score }}</div>
              <div class="podium-block podium-block-bronze">🥉</div>
            </div>
          </div>

          <!-- Full standings -->
          <v-card class="standings-card" color="surface" rounded="xl" elevation="2">
            <div class="pa-4 pb-0 text-caption font-weight-bold text-medium-emphasis standings-title">
              FINAL STANDINGS
            </div>
            <v-list bg-color="transparent" density="compact" class="pb-2">
              <v-list-item
                v-for="(entry, idx) in leaderboard"
                :key="entry.player_id"
                class="standing-row px-4"
                :class="{ 'standing-winner': idx === 0 }"
                :style="{ animationDelay: `${idx * 0.08 + 0.4}s` }"
                rounded="lg"
              >
                <template #prepend>
                  <span class="medal-icon mr-2">{{ ['🥇','🥈','🥉'][idx] ?? `#${idx+1}` }}</span>
                  <v-avatar :color="entry.avatar_color" size="30" rounded="lg" class="mr-3">
                    <span class="st-avatar-initial-sm">{{ initials(entry.player_name) }}</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">{{ entry.player_name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">{{ entry.rounds_played }} rounds · {{ entry.times_bidder }} bids</v-list-item-subtitle>
                <template #append>
                  <v-chip
                    :color="entry.current_score >= 0 ? 'success' : 'error'"
                    size="small" label class="font-weight-bold"
                  >
                    {{ entry.current_score >= 0 ? '+' : '' }}{{ entry.current_score }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- Actions -->
          <div class="winner-actions">
            <v-btn
              size="large" color="primary" rounded="pill" elevation="4"
              prepend-icon="mdi-plus-circle"
              @click="winnerDialog = false; $router.push('/games')"
            >
              New Game
            </v-btn>
            <v-btn
              size="large" variant="outlined" color="primary" rounded="pill"
              prepend-icon="mdi-eye"
              @click="winnerDialog = false"
            >
              View Results
            </v-btn>
          </div>
        </div>
      </div>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gamesAPI } from '@/api'
import { useAppStore } from '@/store'
import { BID_TYPE_LABELS, SUIT_META, buildChartSeries } from '@/utils/scoring'
import { playWinnerSound } from '@/utils/sound'
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
function shortName(n = '') { return n.split(' ')[0] }
function fmtDate(d)       { return new Date(d).toLocaleDateString() }
function suitLabel(suit) { return SUIT_META[suit]?.label || '—' }

// Deterministic confetti styles — stable across renders
const confettiStyles = Array.from({ length: 65 }, (_, i) => ({
  left:              `${(i * 17 + 7) % 100}%`,
  animationDelay:    `${((i * 0.13) % 4).toFixed(2)}s`,
  animationDuration: `${(2.5 + (i * 0.19) % 2.5).toFixed(2)}s`,
  background:        ['#1D4ED8','#2563EB','#0EA5E9','#3B82F6','#38BDF8','#60A5FA','#93C5FD','#D97706'][i % 8],
  width:             `${6 + (i % 5) * 2}px`,
  height:            `${10 + (i % 4) * 3}px`,
  borderRadius:      i % 3 === 0 ? '50%' : '2px',
}))

const chartData = computed(() => {
  if (!game.value || !rounds.value.length) return { series: [], colors: [], categories: [] }
  return buildChartSeries(game.value.players || [], rounds.value)
})

const canManageGame = computed(() => {
  if (!game.value) return false
  return store.canManageGame(game.value)
})

const chartOptions = computed(() => ({
  chart:  { background: 'transparent', toolbar: { show: false }, animations: { enabled: true } },
  theme:  { mode: 'light' },
  colors: chartData.value.colors,
  stroke: { curve: 'smooth', width: 2.5 },
  markers: { size: 4 },
  xaxis:  { categories: chartData.value.categories, labels: { style: { colors: '#64748B' } } },
  yaxis:  { labels: { style: { colors: '#64748B' }, formatter: v => (v >= 0 ? `+${v}` : `${v}`) } },
  grid:   { borderColor: '#D6E6FF' },
  legend: { labels: { colors: '#1E3A8A' } },
  tooltip: { theme: 'light' },
}))

const leader = computed(() => leaderboard.value[0] || null)
const runnerUp = computed(() => leaderboard.value[1] || null)

const bidStats = computed(() => {
  const total = rounds.value.length
  const won = rounds.value.filter(round => round.bid_won).length
  return {
    total,
    won,
    lost: total - won,
    rate: total ? Math.round((won / total) * 100) : 0,
  }
})

const averageBid = computed(() => {
  if (!rounds.value.length) return 0
  const total = rounds.value.reduce((sum, round) => sum + scoreNumber(round.bid_amount), 0)
  return (total / rounds.value.length).toFixed(1)
})

const highestBidRound = computed(() =>
  rounds.value.reduce((best, round) => {
    if (!best || scoreNumber(round.bid_amount) >= scoreNumber(best.bid_amount)) return round
    return best
  }, null)
)

const biggestSwing = computed(() => {
  let best = null
  for (const round of rounds.value) {
    const participants = Array.isArray(round.participants) ? round.participants : []
    for (const participant of participants) {
      const score = scoreNumber(participant.score)
      if (Math.abs(score) > Math.abs(best?.score || 0)) {
        best = {
          playerName: participant.player_name,
          score,
          roundNumber: round.round_number,
        }
      }
    }
  }
  return best
})

const recentRounds = computed(() => rounds.value.slice(-3))
const momentumWindow = computed(() => Math.min(3, rounds.value.length))

const playerMomentumMap = computed(() => {
  const totals = {}
  for (const entry of leaderboard.value) totals[entry.player_id] = 0

  for (const round of recentRounds.value) {
    const participants = Array.isArray(round.participants) ? round.participants : []
    for (const participant of participants) {
      totals[participant.player_id] = (totals[participant.player_id] || 0) + scoreNumber(participant.score)
    }
  }

  return totals
})

const momentumScale = computed(() => {
  const values = Object.values(playerMomentumMap.value).map(value => Math.abs(value))
  return Math.max(1, ...values)
})

const replayTimeline = computed(() => {
  if (!rounds.value.length) return []

  const totals = new Map()
  for (const entry of leaderboard.value) {
    totals.set(entry.player_id, 0)
  }

  return rounds.value.map((round) => {
    const participants = Array.isArray(round.participants) ? round.participants : []

    for (const participant of participants) {
      const current = totals.get(participant.player_id) || 0
      totals.set(participant.player_id, current + scoreNumber(participant.score))
    }

    const snapshot = leaderboard.value
      .map((entry) => ({
        id: entry.player_id,
        name: entry.player_name,
        score: totals.get(entry.player_id) || 0,
      }))
      .sort((a, b) => b.score - a.score)

    return {
      round_id: round.id,
      round_number: round.round_number,
      bidder_name: round.bidder_name,
      bid_amount: round.bid_amount,
      bid_type: round.bid_type,
      bid_won: round.bid_won,
      trump_suit: round.trump_suit,
      bidder_score: round.bidder_score,
      points_won_by_bidding_team: round.points_won_by_bidding_team,
      participants,
      leading_player: snapshot[0] || null,
      top_snapshot: snapshot.slice(0, 3),
    }
  })
})

const gameInsights = computed(() => {
  if (!game.value) return []

  const margin = leader.value && runnerUp.value
    ? scoreNumber(leader.value.current_score) - scoreNumber(runnerUp.value.current_score)
    : 0
  const highBid = highestBidRound.value
  const swing = biggestSwing.value

  return [
    {
      key: 'race',
      label: 'Race Leader',
      value: leader.value ? leader.value.player_name : 'Ready',
      detail: rounds.value.length
        ? margin === 0
          ? `Tied at ${signed(scoreNumber(leader.value?.current_score))}`
          : `${runnerUp.value?.player_name || 'Field'} is ${margin} back`
        : 'Play the first round to start the chase',
      icon: 'mdi-podium-gold',
      color: 'secondary',
      tone: 'race',
    },
    {
      key: 'bid-health',
      label: 'Bid Health',
      value: bidStats.value.total ? `${bidStats.value.rate}%` : 'No bids',
      detail: bidStats.value.total
        ? `${bidStats.value.won} won, ${bidStats.value.lost} lost`
        : 'Wins and losses appear here',
      icon: 'mdi-target-variant',
      color: bidStats.value.rate >= 50 ? 'success' : 'error',
      tone: 'bid',
    },
    {
      key: 'stakes',
      label: 'Table Stakes',
      value: rounds.value.length ? `Avg ${averageBid.value}` : 'Bid 28+',
      detail: highBid
        ? `High bid ${highBid.bid_amount} by ${highBid.bidder_name}`
        : 'Bid range opens at 28',
      icon: 'mdi-gavel',
      color: 'warning',
      tone: 'stakes',
    },
    {
      key: 'swing',
      label: 'Biggest Swing',
      value: swing ? signed(swing.score) : 'Waiting',
      detail: swing
        ? `${swing.playerName}, round ${swing.roundNumber}`
        : 'Largest score movement shows here',
      icon: 'mdi-lightning-bolt',
      color: swing && swing.score < 0 ? 'error' : 'info',
      tone: 'swing',
    },
  ]
})

const gameAwards = computed(() => {
  if (!rounds.value.length) return []

  const awards = []
  const highBid = highestBidRound.value
  const swing = biggestSwing.value
  const bestBidder = [...leaderboard.value]
    .filter(entry => scoreNumber(entry.times_bidder) > 0)
    .sort((a, b) => {
      const aRate = scoreNumber(a.bids_won) / scoreNumber(a.times_bidder)
      const bRate = scoreNumber(b.bids_won) / scoreNumber(b.times_bidder)
      return bRate - aRate || scoreNumber(b.times_bidder) - scoreNumber(a.times_bidder)
    })[0]
  const momentumLeaderId = Object.entries(playerMomentumMap.value)
    .sort((a, b) => b[1] - a[1])[0]?.[0]
  const momentumLeader = leaderboard.value.find(entry => String(entry.player_id) === String(momentumLeaderId))

  if (highBid) {
    awards.push({
      key: 'risk-taker',
      title: 'Risk Taker',
      playerName: highBid.bidder_name,
      detail: `Pushed the table to bid ${highBid.bid_amount}`,
      icon: 'mdi-fire',
      color: 'warning',
    })
  }

  if (bestBidder) {
    awards.push({
      key: 'sharp-bidder',
      title: 'Sharp Bidder',
      playerName: bestBidder.player_name,
      detail: `${Math.round(scoreNumber(bestBidder.bids_won) / scoreNumber(bestBidder.times_bidder) * 100)}% bid win rate`,
      icon: 'mdi-crosshairs-gps',
      color: 'success',
    })
  }

  if (momentumLeader && scoreNumber(playerMomentumMap.value[momentumLeader.player_id]) > 0) {
    awards.push({
      key: 'momentum-run',
      title: 'Momentum Run',
      playerName: momentumLeader.player_name,
      detail: `${signed(playerMomentumMap.value[momentumLeader.player_id])} over the last ${momentumWindow.value} rounds`,
      icon: 'mdi-trending-up',
      color: 'success',
    })
  }

  if (swing) {
    awards.push({
      key: 'table-shaker',
      title: 'Table Shaker',
      playerName: swing.playerName,
      detail: `${signed(swing.score)} in round ${swing.roundNumber}`,
      icon: 'mdi-lightning-bolt',
      color: swing.score < 0 ? 'error' : 'info',
    })
  }

  return awards.slice(0, 4)
})

const winnerAwards = computed(() => {
  if (!leader.value) return []
  const matched = gameAwards.value.filter(award => award.playerName === leader.value.player_name)
  return matched.length
    ? matched
    : [{
      key: 'table-champion',
      title: 'Table Champion',
      playerName: leader.value.player_name,
      detail: 'Finished on top',
      icon: 'mdi-crown',
      color: 'secondary',
    }]
})

function scoreNumber(value) {
  return Number(value) || 0
}

function signed(value) {
  const amount = scoreNumber(value)
  return `${amount >= 0 ? '+' : ''}${amount}`
}

function pointsBehind(entry) {
  if (!leader.value) return 0
  return Math.max(0, scoreNumber(leader.value.current_score) - scoreNumber(entry.current_score))
}

function playerMomentum(playerId) {
  const value = scoreNumber(playerMomentumMap.value[playerId])
  if (value > 0) {
    return {
      value,
      label: `${signed(value)} lately`,
      icon: 'mdi-trending-up',
      color: 'success',
    }
  }
  if (value < 0) {
    return {
      value,
      label: `${signed(value)} lately`,
      icon: 'mdi-trending-down',
      color: 'error',
    }
  }
  return {
    value,
    label: 'steady lately',
    icon: 'mdi-minus',
    color: 'grey',
  }
}

function momentumProgress(entry) {
  const value = Math.abs(scoreNumber(playerMomentumMap.value[entry.player_id]))
  if (!value) return 2
  return Math.max(8, Math.round((value / momentumScale.value) * 100))
}

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

watch(winnerDialog, visible => {
  if (visible) playWinnerSound()
})

onMounted(fetchAll)
</script>

<style scoped>
.leader-row { background: rgba(var(--st-primary-rgb), 0.06); }

.rank-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--st-primary-rgb), 0.08);
}

.game-insight-grid .v-col {
  display: flex;
}

.insight-card {
  width: 100%;
  min-height: 124px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-left: 4px solid rgba(var(--st-primary-rgb), 0.4) !important;
}

.insight-race { border-left-color: rgb(var(--st-secondary-rgb)) !important; }
.insight-bid { border-left-color: #31A24C !important; }
.insight-stakes { border-left-color: #F0A202 !important; }
.insight-swing { border-left-color: #1877F2 !important; }

.insight-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(var(--st-primary-rgb), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-body {
  min-width: 0;
}

.insight-label {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--st-text-muted);
}

.insight-value {
  margin-top: 5px;
  font-size: 1.15rem;
  line-height: 1.2;
  font-weight: 900;
  color: rgb(var(--v-theme-on-surface));
  overflow-wrap: anywhere;
}

.insight-detail {
  margin-top: 4px;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--st-text-muted);
}

.standings-microline {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--st-text-muted);
}

.micro-separator {
  color: rgba(var(--v-theme-on-surface), 0.28);
}

.momentum-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--st-panel-border);
}

.momentum-row:last-child {
  border-bottom: 0;
}

.momentum-head {
  margin-bottom: 7px;
}

.momentum-name {
  min-width: 0;
  font-size: 0.88rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.award-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--st-panel-border);
}

.award-row:last-child {
  border-bottom: 0;
}

.award-icon {
  flex-shrink: 0;
}

.award-body {
  min-width: 0;
}

.award-title {
  font-size: 0.82rem;
  font-weight: 900;
  color: rgb(var(--v-theme-on-surface));
}

.award-player {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  overflow-wrap: anywhere;
}

.award-detail {
  margin-top: 2px;
  font-size: 0.74rem;
  line-height: 1.35;
  color: var(--st-text-muted);
}

.replay-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.replay-item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  align-items: flex-start;
}

.replay-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}

.replay-dot {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  color: #fff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.16);
}

.replay-win {
  background: linear-gradient(135deg, rgb(var(--st-primary-rgb)), #22c55e);
}

.replay-loss {
  background: linear-gradient(135deg, #ef4444, #f97316);
}

.replay-line {
  width: 2px;
  flex: 1;
  min-height: 36px;
  margin-top: 8px;
  background: linear-gradient(180deg, rgba(var(--st-primary-rgb), 0.35), rgba(var(--st-primary-rgb), 0.08));
}

.replay-item:last-child .replay-line {
  background: transparent;
}

.replay-body {
  min-width: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(var(--st-primary-rgb), 0.04);
  border: 1px solid rgba(var(--st-primary-rgb), 0.12);
}

.winner-overlay {
  min-height: 100vh;
  background: linear-gradient(165deg, #f8fbff 0%, #edf4ff 44%, #dbeafe 100%);
  overflow-y: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px 64px;
}

.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.confetti-piece {
  position: absolute;
  top: -20px;
  animation: confetti-fall linear infinite;
}

@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg) translateX(0); opacity: 1; }
  50% { transform: translateY(50vh) rotate(360deg) translateX(15px); opacity: 0.9; }
  100% { transform: translateY(110vh) rotate(720deg) translateX(-10px); opacity: 0; }
}

.winner-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.winner-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.trophy-bounce {
  font-size: 84px;
  line-height: 1;
  display: inline-block;
  filter: drop-shadow(0 0 20px rgba(37, 99, 235, 0.28));
  animation: trophy-bounce 1s ease-in-out infinite alternate;
}

@keyframes trophy-bounce {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-14px) scale(1.07); }
}

.game-over-text {
  font-size: 2.8rem;
  font-weight: 900;
  color: #0f172a;
  text-shadow: 0 0 24px rgba(37, 99, 235, 0.18);
  margin: 8px 0 2px;
  letter-spacing: 0;
  animation: fade-up 0.5s ease 0s both;
}

.winner-subtitle {
  font-size: 14px;
}

.winner-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: fade-up 0.5s ease 0.15s both;
}

.glow-ring {
  padding: 4px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1d4ed8, #2563eb, #0ea5e9, #60a5fa);
  animation: glow-pulse 2.2s ease-in-out infinite alternate;
}

@keyframes glow-pulse {
  0% { box-shadow: 0 0 18px rgba(37, 99, 235, 0.22); }
  100% { box-shadow: 0 0 44px rgba(14, 165, 233, 0.3); }
}

.winner-avatar-anim {
  animation: avatar-pop 0.55s cubic-bezier(.34, 1.56, .64, 1) 0.1s both;
}

.winner-avatar-initial {
  font-size: 2rem;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.75);
}

@keyframes avatar-pop {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.winner-name-text {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
  text-shadow: 0 2px 12px rgba(37, 99, 235, 0.16);
  animation: fade-up 0.4s ease 0.3s both;
}

.champion-badge {
  background: linear-gradient(135deg, #1d4ed8, #0ea5e9);
  color: #fff;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 3px;
  padding: 5px 22px;
  border-radius: 20px;
  animation: fade-up 0.4s ease 0.4s both;
}

.winner-score-big {
  font-size: 3.8rem;
  font-weight: 900;
  color: rgb(var(--st-primary-rgb));
  text-shadow: 0 0 24px rgba(37, 99, 235, 0.3);
  letter-spacing: 0;
  line-height: 1;
  animation: score-pop 0.6s cubic-bezier(.34, 1.56, .64, 1) 0.5s both;
}

.winner-awards {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 100%;
  animation: fade-up 0.4s ease 0.65s both;
}

@keyframes score-pop {
  0% { transform: scale(0.4) translateY(16px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.podium-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  width: 100%;
  animation: fade-up 0.5s ease 0.6s both;
}

.podium-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.podium-block {
  width: 92px;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.podium-block-silver {
  height: 50px;
  border-top: 2px solid #94a3b8;
  background: rgba(148, 163, 184, 0.14);
}

.podium-block-gold {
  height: 76px;
  border-top: 2px solid rgb(var(--st-primary-rgb));
  background: rgba(var(--st-primary-rgb), 0.14);
}

.podium-block-bronze {
  height: 36px;
  border-top: 2px solid #b45309;
  background: rgba(180, 83, 9, 0.12);
}

.podium-pname {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-weight: 600;
}

.podium-pscore {
  font-size: 11px;
  font-weight: 700;
}

.podium-pscore-silver {
  color: #94a3b8;
}

.podium-pscore-bronze {
  color: #b45309;
}

.standings-card {
  width: 100%;
  border: 1px solid var(--st-panel-border-strong) !important;
  animation: fade-up 0.5s ease 0.7s both;
}

.standings-title {
  letter-spacing: 0.12em;
}

.standing-row {
  animation: slide-in 0.35s ease both;
}

@keyframes slide-in {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.standing-winner {
  background: rgba(var(--st-primary-rgb), 0.08) !important;
}

.medal-icon {
  font-size: 18px;
  min-width: 24px;
  text-align: center;
}

.winner-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  animation: fade-up 0.4s ease 1s both;
}

@keyframes fade-up {
  from { transform: translateY(22px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
