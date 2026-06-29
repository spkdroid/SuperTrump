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
            color="info"
            variant="tonal"
            prepend-icon="mdi-scoreboard"
            rounded="lg"
            :to="`/games/${gameId}/live`"
          >
            Live Scores
          </v-btn>
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
            <p class="text-medium-emphasis mb-2" style="font-size:14px;">{{ game?.name }}</p>
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
                <span class="text-h4 font-weight-black" style="color:rgba(0,0,0,0.75)">
                  {{ initials(leaderboard[0].player_name) }}
                </span>
              </v-avatar>
            </div>
            <div class="winner-name-text">{{ leaderboard[0].player_name }}</div>
            <div class="champion-badge">🥇 CHAMPION</div>
            <div class="winner-score-big">
              {{ leaderboard[0].current_score >= 0 ? '+' : '' }}{{ leaderboard[0].current_score }}
            </div>
          </div>

          <!-- Podium (top 3) -->
          <div v-if="leaderboard.length > 1" class="podium-wrap">
            <!-- 2nd -->
            <div v-if="leaderboard[1]" class="podium-slot">
              <v-avatar :color="leaderboard[1].avatar_color" size="46" rounded="lg">
                <span style="font-size:12px;font-weight:700;color:rgba(0,0,0,0.7)">{{ initials(leaderboard[1].player_name) }}</span>
              </v-avatar>
              <div class="podium-pname">{{ shortName(leaderboard[1].player_name) }}</div>
              <div class="podium-pscore" style="color:#C0C0C0">{{ leaderboard[1].current_score >= 0 ? '+' : '' }}{{ leaderboard[1].current_score }}</div>
              <div class="podium-block" style="height:50px;border-top:2px solid #C0C0C0;background:rgba(192,192,192,0.1);">🥈</div>
            </div>
            <!-- 1st pedestal -->
            <div class="podium-slot">
              <div class="podium-block" style="height:76px;border-top:2px solid #FCD34D;background:rgba(252,211,77,0.12);">🥇</div>
            </div>
            <!-- 3rd -->
            <div v-if="leaderboard[2]" class="podium-slot">
              <v-avatar :color="leaderboard[2].avatar_color" size="46" rounded="lg">
                <span style="font-size:12px;font-weight:700;color:rgba(0,0,0,0.7)">{{ initials(leaderboard[2].player_name) }}</span>
              </v-avatar>
              <div class="podium-pname">{{ shortName(leaderboard[2].player_name) }}</div>
              <div class="podium-pscore" style="color:#CD7F32">{{ leaderboard[2].current_score >= 0 ? '+' : '' }}{{ leaderboard[2].current_score }}</div>
              <div class="podium-block" style="height:36px;border-top:2px solid #CD7F32;background:rgba(205,127,50,0.1);">🥉</div>
            </div>
          </div>

          <!-- Full standings -->
          <v-card class="standings-card" color="surface" rounded="xl" elevation="2">
            <div class="pa-4 pb-0 text-caption font-weight-bold text-medium-emphasis" style="letter-spacing:.12em">
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
                    <span style="font-size:9px;font-weight:700;color:rgba(0,0,0,0.7)">{{ initials(entry.player_name) }}</span>
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
              size="large" variant="tonal" color="white" rounded="pill"
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
function shortName(n = '') { return n.split(' ')[0] }
function fmtDate(d)       { return new Date(d).toLocaleDateString() }

// Deterministic confetti styles — stable across renders
const confettiStyles = Array.from({ length: 65 }, (_, i) => ({
  left:              `${(i * 17 + 7) % 100}%`,
  animationDelay:    `${((i * 0.13) % 4).toFixed(2)}s`,
  animationDuration: `${(2.5 + (i * 0.19) % 2.5).toFixed(2)}s`,
  background:        ['#4ADE80','#FCD34D','#60A5FA','#F87171','#C084FC','#34D399','#FB923C','#38BDF8'][i % 8],
  width:             `${6 + (i % 5) * 2}px`,
  height:            `${10 + (i % 4) * 3}px`,
  borderRadius:      i % 3 === 0 ? '50%' : '2px',
}))

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

/* ─────────── Winner Overlay ─────────────────────────────────────── */
.winner-overlay {
  min-height: 100vh;
  background: linear-gradient(160deg, #050e0c 0%, #06101c 50%, #140922 100%);
  overflow-y: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px 64px;
}

/* Confetti */
.confetti-container {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; overflow: hidden; z-index: 0;
}
.confetti-piece {
  position: absolute; top: -20px;
  animation: confetti-fall linear infinite;
}
@keyframes confetti-fall {
  0%   { transform: translateY(-20px)  rotate(0deg)   translateX(0px);   opacity: 1; }
  50%  { transform: translateY(50vh)   rotate(360deg) translateX(15px);  opacity: 0.9; }
  100% { transform: translateY(110vh)  rotate(720deg) translateX(-10px); opacity: 0; }
}

/* Content wrapper */
.winner-content {
  position: relative; z-index: 1;
  width: 100%; max-width: 500px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}

/* Header */
.winner-header { display: flex; flex-direction: column; align-items: center; }
.trophy-bounce {
  font-size: 84px; line-height: 1;
  display: inline-block;
  filter: drop-shadow(0 0 24px rgba(252,211,77,0.55));
  animation: trophy-bounce 1s ease-in-out infinite alternate;
}
@keyframes trophy-bounce {
  0%   { transform: translateY(0)    scale(1);    }
  100% { transform: translateY(-14px) scale(1.07); }
}
.game-over-text {
  font-size: 2.8rem; font-weight: 900; color: #fff;
  text-shadow: 0 0 32px rgba(252,211,77,0.4), 0 2px 10px rgba(0,0,0,0.7);
  margin: 8px 0 2px; letter-spacing: -1px;
  animation: fade-up 0.5s ease 0s both;
}

/* Winner card */
.winner-showcase {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  animation: fade-up 0.5s ease 0.15s both;
}
.glow-ring {
  padding: 4px; border-radius: 20px;
  background: linear-gradient(135deg, #FCD34D, #4ADE80, #60A5FA, #C084FC);
  animation: glow-pulse 2.2s ease-in-out infinite alternate;
}
@keyframes glow-pulse {
  0%   { box-shadow: 0 0 24px rgba(252,211,77,0.35); }
  100% { box-shadow: 0 0 60px rgba(74,222,128,0.55); }
}
.winner-avatar-anim { animation: avatar-pop 0.55s cubic-bezier(.34,1.56,.64,1) 0.1s both; }
@keyframes avatar-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1);   opacity: 1; }
}
.winner-name-text {
  font-size: 1.8rem; font-weight: 800; color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
  animation: fade-up 0.4s ease 0.3s both;
}
.champion-badge {
  background: linear-gradient(135deg, #F59E0B, #FCD34D);
  color: #1a0800; font-weight: 900; font-size: 12px; letter-spacing: 3px;
  padding: 5px 22px; border-radius: 20px;
  animation: fade-up 0.4s ease 0.4s both;
}
.winner-score-big {
  font-size: 3.8rem; font-weight: 900; color: #FCD34D;
  text-shadow: 0 0 28px rgba(252,211,77,0.65);
  letter-spacing: -2px; line-height: 1;
  animation: score-pop 0.6s cubic-bezier(.34,1.56,.64,1) 0.5s both;
}
@keyframes score-pop {
  0%   { transform: scale(0.4) translateY(16px); opacity: 0; }
  100% { transform: scale(1)   translateY(0);    opacity: 1; }
}

/* Podium */
.podium-wrap {
  display: flex; align-items: flex-end; justify-content: center; gap: 4px;
  width: 100%;
  animation: fade-up 0.5s ease 0.6s both;
}
.podium-slot  { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.podium-block {
  width: 92px; border-radius: 8px 8px 0 0;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.podium-pname  { font-size: 11px; color: rgba(255,255,255,0.8); font-weight: 600; }
.podium-pscore { font-size: 11px; font-weight: 700; }

/* Standings */
.standings-card {
  width: 100%;
  border: 1px solid rgba(74,222,128,0.15) !important;
  animation: fade-up 0.5s ease 0.7s both;
}
.standing-row {
  animation: slide-in 0.35s ease both;
}
@keyframes slide-in {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
.standing-winner { background: rgba(252,211,77,0.05) !important; }
.medal-icon { font-size: 18px; min-width: 24px; text-align: center; }

/* Actions */
.winner-actions {
  display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
  animation: fade-up 0.4s ease 1s both;
}

/* Shared keyframe */
@keyframes fade-up {
  from { transform: translateY(22px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
</style>
