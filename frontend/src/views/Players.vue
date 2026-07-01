<template>
  <v-container fluid class="pa-6">
    <div class="st-page-shell">
      <!-- Header -->
      <div class="st-header-row flex-wrap gap-3">
        <div>
          <h1 class="st-page-title">Players</h1>
          <p class="st-page-subtitle">
            {{ filteredPlayers.length }} shown · {{ players.length }} total
          </p>
        </div>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi-account-plus" rounded="lg" @click="openCreate">
          Add Player
        </v-btn>
      </div>

      <div class="d-flex align-center flex-wrap gap-3 mb-4">
        <v-text-field
          v-model="search"
          variant="outlined"
          density="compact"
          color="primary"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          label="Search players"
          class="players-search"
        />
        <v-select
          v-model="activityFilter"
          :items="activityOptions"
          item-title="title"
          item-value="value"
          label="Activity"
          variant="outlined"
          density="compact"
          hide-details
          class="players-select"
        />
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          item-title="title"
          item-value="value"
          label="Sort"
          variant="outlined"
          density="compact"
          hide-details
          class="players-select"
        />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="56" />
      </div>

      <!-- Empty -->
      <div v-else-if="!players.length" class="text-center py-16 text-medium-emphasis">
        <v-icon size="72" class="mb-4 opacity-30">mdi-account-group-outline</v-icon>
        <div class="text-h6">No players yet</div>
        <v-btn class="mt-4" color="primary" rounded="lg" @click="openCreate">Add First Player</v-btn>
      </div>

      <div v-else-if="!filteredPlayers.length" class="text-center py-16 text-medium-emphasis">
        <v-icon size="64" class="mb-3 opacity-30">mdi-filter-remove-outline</v-icon>
        <div class="text-h6">No players match your filters</div>
      </div>

      <!-- Player Grid -->
      <v-row v-else>
        <v-col
          v-for="player in filteredPlayers"
          :key="player.id"
          cols="12" sm="6" md="4" lg="3"
        >
          <v-card
            color="surface"
            rounded="xl"
            elevation="0"
            class="player-card st-panel st-lift pa-5"
          >
            <!-- Avatar + Actions -->
            <div class="d-flex align-start justify-space-between mb-4">
              <v-avatar :color="player.avatar_color" size="56" rounded="xl">
                <span class="st-avatar-initial-lg text-h6">
                  {{ initials(player.name) }}
                </span>
              </v-avatar>
              <div class="d-flex align-center">
                <v-btn icon="mdi-chart-box-outline" size="x-small" variant="text" color="info"
                  @click="openAnalytics(player)" />
                <v-btn icon="mdi-pencil" size="x-small" variant="text" color="primary"
                  @click="openEdit(player)" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error"
                  @click="confirmDelete(player)" />
              </div>
            </div>

            <!-- Name + Score -->
            <div class="text-subtitle-1 font-weight-bold mb-1">{{ player.name }}</div>
            <v-chip
              :color="player.total_score >= 0 ? 'success' : 'error'"
              size="small"
              label
              variant="tonal"
              class="mb-4"
            >
              Total: {{ player.total_score >= 0 ? '+' : '' }}{{ player.total_score }}
            </v-chip>

            <!-- Stats Grid -->
            <div class="stats-grid">
              <div class="stat-item">
                <div class="text-h6 font-weight-bold text-primary">{{ player.games_played }}</div>
                <div class="text-caption text-medium-emphasis">Games</div>
              </div>
              <div class="stat-item">
                <div class="text-h6 font-weight-bold text-secondary">{{ player.games_won }}</div>
                <div class="text-caption text-medium-emphasis">Wins</div>
              </div>
              <div class="stat-item">
                <div class="text-h6 font-weight-bold text-info">{{ player.rounds_as_bidder }}</div>
                <div class="text-caption text-medium-emphasis">As Bidder</div>
              </div>
              <div class="stat-item">
                <div class="text-h6 font-weight-bold text-warning">{{ bidRate(player) }}%</div>
                <div class="text-caption text-medium-emphasis">Bid Win%</div>
              </div>
            </div>

            <!-- Win-rate bar -->
            <v-progress-linear
              :model-value="winRate(player)"
              color="primary"
              bg-color="surface-variant"
              rounded
              height="5"
              class="mt-4"
            />
            <div class="d-flex justify-space-between mt-1">
              <span class="text-caption text-medium-emphasis">Win rate</span>
              <span class="text-caption text-primary font-weight-medium">{{ winRate(player) }}%</span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- ── Create / Edit Dialog ────────────────────────────── -->
      <v-dialog v-model="formDialog" max-width="440" persistent>
        <v-card color="surface" rounded="xl" class="st-panel">
          <v-card-title class="pa-5 pb-3 d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-account</v-icon>
            {{ editingPlayer ? 'Edit Player' : 'Add Player' }}
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" @click="formDialog = false" />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <v-text-field
              v-model="form.name"
              label="Player Name"
              variant="outlined"
              color="primary"
              :rules="[v => !!v?.trim() || 'Name is required']"
              autofocus
              class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-3">Avatar Color</div>
            <div class="d-flex flex-wrap gap-2 mb-4">
              <v-btn
                v-for="color in avatarColors"
                :key="color"
                :color="color"
                icon
                size="36"
                rounded="lg"
                :variant="form.avatar_color === color ? 'flat' : 'tonal'"
                :class="{ 'color-selected': form.avatar_color === color }"
                @click="form.avatar_color = color"
              >
                <v-icon v-if="form.avatar_color === color" size="16">mdi-check</v-icon>
              </v-btn>
            </div>
            <!-- Preview -->
            <div class="d-flex align-center gap-3 pa-3 rounded-lg st-soft-surface st-soft-border player-preview">
              <v-avatar :color="form.avatar_color" size="40" rounded="lg">
                <span class="st-avatar-initial-lg">
                  {{ initials(form.name || 'P') }}
                </span>
              </v-avatar>
              <span class="text-subtitle-2">{{ form.name || 'Player Name' }}</span>
            </div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4">
            <v-spacer />
            <v-btn variant="text" @click="formDialog = false">Cancel</v-btn>
            <v-btn color="primary" rounded="lg" :loading="saving" @click="savePlayer">
              {{ editingPlayer ? 'Save Changes' : 'Add Player' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ── Analytics Dialog ─────────────────────────────── -->
      <v-dialog v-model="analyticsDialog" max-width="1080" scrollable>
        <v-card color="surface" rounded="xl" class="st-panel">
          <v-card-title class="pa-5 pb-3 d-flex align-center">
            <v-icon color="info" class="mr-2">mdi-chart-box-outline</v-icon>
            Player Analytics
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" @click="analyticsDialog = false" />
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-5">
            <div v-if="analyticsLoading" class="text-center py-16">
              <v-progress-circular indeterminate color="primary" size="56" />
            </div>

            <template v-else-if="analytics">
              <div class="d-flex align-center gap-4 flex-wrap mb-5">
                <v-avatar :color="analytics.player.avatar_color" size="68" rounded="xl">
                  <span class="st-avatar-initial-lg text-h5">
                    {{ initials(analytics.player.name) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-black">{{ analytics.player.name }}</div>
                  <div class="text-medium-emphasis">
                    {{ analytics.summary.score_label }} total score · {{ analytics.summary.games_label }}
                  </div>
                </div>
                <v-spacer />
                <div class="d-flex flex-wrap gap-2">
                  <v-chip color="primary" variant="tonal" label>
                    Current {{ analytics.streak.current.type }} streak: {{ analytics.streak.current.length }}
                  </v-chip>
                  <v-chip color="secondary" variant="tonal" label>
                    Best win streak: {{ analytics.streak.best.win }}
                  </v-chip>
                  <v-chip color="warning" variant="tonal" label>
                    Best loss streak: {{ analytics.streak.best.loss }}
                  </v-chip>
                </div>
              </div>

              <v-row class="mb-4">
                <v-col cols="6" md="3" v-for="card in analyticsCards" :key="card.label">
                  <v-card color="surface-variant" rounded="lg" elevation="0" class="pa-4 text-center st-panel">
                    <div class="text-h5 font-weight-black" :class="card.colorClass">{{ card.value }}</div>
                    <div class="text-caption text-medium-emphasis mt-1">{{ card.label }}</div>
                  </v-card>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" lg="5">
                  <v-card color="surface-variant" rounded="xl" elevation="0" class="pa-4 st-panel h-100">
                    <div class="text-subtitle-1 font-weight-bold mb-3">Bid Type Performance</div>
                    <div v-if="analytics.bid_breakdown.length" class="analytics-list">
                      <div
                        v-for="row in analytics.bid_breakdown"
                        :key="row.bid_type"
                        class="analytics-row"
                      >
                        <div class="d-flex align-center justify-space-between mb-1">
                          <div class="font-weight-medium">{{ row.label }}</div>
                          <v-chip size="x-small" label color="primary" variant="tonal">
                            {{ row.attempts }} bids
                          </v-chip>
                        </div>
                        <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis">
                          <span>{{ row.wins }} wins · {{ row.win_rate }}% success</span>
                          <span :class="row.total_score >= 0 ? 'text-success' : 'text-error'">
                            {{ row.total_score >= 0 ? '+' : '' }}{{ row.total_score }}
                          </span>
                        </div>
                        <v-progress-linear
                          :model-value="row.win_rate"
                          color="primary"
                          bg-color="surface-variant"
                          rounded
                          height="6"
                          class="mt-2"
                        />
                      </div>
                    </div>
                    <div v-else class="text-center py-8 text-medium-emphasis">
                      No bidder history yet.
                    </div>
                  </v-card>
                </v-col>

                <v-col cols="12" lg="7">
                  <v-card color="surface-variant" rounded="xl" elevation="0" class="pa-4 st-panel mb-4">
                    <div class="text-subtitle-1 font-weight-bold mb-3">Best Partners</div>
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th class="text-right">Rounds</th>
                          <th class="text-right">Win%</th>
                          <th class="text-right">Avg Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="partner in analytics.partner_synergy" :key="partner.player_id">
                          <td>
                            <div class="d-flex align-center gap-2 py-2">
                              <v-avatar :color="partner.avatar_color" size="28" rounded="lg">
                                <span class="st-avatar-initial-sm">
                                  {{ initials(partner.player_name) }}
                                </span>
                              </v-avatar>
                              <span class="text-body-2 font-weight-medium">{{ partner.player_name }}</span>
                            </div>
                          </td>
                          <td class="text-right">{{ partner.rounds_together }}</td>
                          <td class="text-right">{{ partner.win_rate }}%</td>
                          <td class="text-right" :class="partner.total_score >= 0 ? 'text-success' : 'text-error'">
                            {{ partner.avg_score >= 0 ? '+' : '' }}{{ partner.avg_score }}
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                    <div v-if="!analytics.partner_synergy.length" class="text-center py-8 text-medium-emphasis">
                      No partner chemistry data yet.
                    </div>
                  </v-card>

                  <v-card color="surface-variant" rounded="xl" elevation="0" class="pa-4 st-panel">
                    <div class="text-subtitle-1 font-weight-bold mb-3">Recent Games</div>
                    <v-table density="compact" class="analytics-games-table">
                      <thead>
                        <tr>
                          <th>Game</th>
                          <th class="text-right">Score</th>
                          <th class="text-right">Rank</th>
                          <th class="text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="game in analytics.recent_games" :key="game.id">
                          <td>
                            <div class="py-2">
                              <div class="text-body-2 font-weight-medium">{{ game.name }}</div>
                              <div class="text-caption text-medium-emphasis">
                                {{ formatDate(game.played_at) }} · {{ game.status }}
                              </div>
                            </div>
                          </td>
                          <td class="text-right">
                            <span :class="game.current_score >= 0 ? 'text-success' : 'text-error'">
                              {{ game.current_score >= 0 ? '+' : '' }}{{ game.current_score }}
                            </span>
                          </td>
                          <td class="text-right">{{ game.final_rank || '—' }}</td>
                          <td class="text-right">
                            <v-chip
                              :color="game.result === null ? 'grey' : game.result ? 'success' : 'error'"
                              size="x-small"
                              label
                              variant="tonal"
                            >
                              {{ game.result === null ? 'Active' : game.result ? 'Win' : 'Loss' }}
                            </v-chip>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                    <div v-if="!analytics.recent_games.length" class="text-center py-8 text-medium-emphasis">
                      No game history yet.
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <v-row class="mt-2">
                <v-col cols="12" md="6">
                  <v-card color="surface-variant" rounded="xl" elevation="0" class="pa-4 st-panel h-100">
                    <div class="text-subtitle-1 font-weight-bold mb-3">Best Game</div>
                    <template v-if="analytics.best_game">
                      <div class="text-h6 font-weight-black">{{ analytics.best_game.name }}</div>
                      <div class="text-medium-emphasis mt-1">
                        Score {{ analytics.best_game.current_score >= 0 ? '+' : '' }}{{ analytics.best_game.current_score }}
                        · Rank {{ analytics.best_game.final_rank || '—' }}
                      </div>
                    </template>
                    <div v-else class="text-medium-emphasis">No completed games yet.</div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card color="surface-variant" rounded="xl" elevation="0" class="pa-4 st-panel h-100">
                    <div class="text-subtitle-1 font-weight-bold mb-3">Toughest Game</div>
                    <template v-if="analytics.worst_game">
                      <div class="text-h6 font-weight-black">{{ analytics.worst_game.name }}</div>
                      <div class="text-medium-emphasis mt-1">
                        Score {{ analytics.worst_game.current_score >= 0 ? '+' : '' }}{{ analytics.worst_game.current_score }}
                        · Rank {{ analytics.worst_game.final_rank || '—' }}
                      </div>
                    </template>
                    <div v-else class="text-medium-emphasis">No completed games yet.</div>
                  </v-card>
                </v-col>
              </v-row>
            </template>
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- ── Delete Confirm ─────────────────────────────────── -->
      <v-dialog v-model="deleteDialog" max-width="380">
        <v-card color="surface" rounded="xl" class="st-panel">
          <v-card-title class="pa-5 pb-3">
            <v-icon color="error" class="mr-2">mdi-delete-outline</v-icon>
            Delete Player?
          </v-card-title>
          <v-card-text class="pa-5 pt-0 text-medium-emphasis">
            Are you sure you want to delete <strong class="text-on-surface">{{ deletingPlayer?.name }}</strong>?
            This action cannot be undone.
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-spacer />
            <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
            <v-btn color="error" rounded="lg" :loading="saving" @click="deletePlayer">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { playersAPI } from '@/api'
import { useAppStore } from '@/store'

const store   = useAppStore()
const loading = ref(true)
const saving  = ref(false)
const players = ref([])
const search = ref('')
const sortBy = ref('score_desc')
const activityFilter = ref('all')
const analyticsDialog = ref(false)
const analyticsLoading = ref(false)
const analytics = ref(null)

const formDialog     = ref(false)
const deleteDialog   = ref(false)
const editingPlayer  = ref(null)
const deletingPlayer = ref(null)

const avatarColors = [
  '#E91E63','#9C27B0','#3F51B5','#2196F3','#00BCD4',
  '#4CAF50','#FF9800','#F44336','#009688','#FF5722',
]

const sortOptions = [
  { title: 'Score (High-Low)', value: 'score_desc' },
  { title: 'Name (A-Z)', value: 'name_asc' },
  { title: 'Wins (High-Low)', value: 'wins_desc' },
  { title: 'Bid Win % (High-Low)', value: 'bid_desc' },
]

const activityOptions = [
  { title: 'All Players', value: 'all' },
  { title: 'Played Games', value: 'active' },
  { title: 'No Games Yet', value: 'new' },
]

const form = ref({ name: '', avatar_color: '#4CAF50' })

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function winRate(p) {
  return p.games_played ? Math.round(p.games_won / p.games_played * 100) : 0
}
function bidRate(p) {
  return p.rounds_as_bidder ? Math.round(p.rounds_won_as_bidder / p.rounds_as_bidder * 100) : 0
}
function formatDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()
}

const analyticsCards = computed(() => {
  const data = analytics.value?.player || {}
  return [
    { label: 'Total Score', value: data.total_score >= 0 ? `+${data.total_score}` : data.total_score ?? 0, colorClass: 'text-success' },
    { label: 'Games Won', value: data.games_won ?? 0, colorClass: 'text-secondary' },
    { label: 'Win Rate', value: `${data.winning_rate ?? 0}%`, colorClass: 'text-primary' },
    { label: 'Bid Success', value: `${data.bidder_success_rate ?? 0}%`, colorClass: 'text-warning' },
  ]
})

const filteredPlayers = computed(() => {
  const term = search.value.trim().toLowerCase()

  let rows = players.value.filter((p) => {
    if (activityFilter.value === 'active' && !p.games_played) return false
    if (activityFilter.value === 'new' && p.games_played) return false

    if (!term) return true
    return p.name?.toLowerCase().includes(term)
  })

  rows = rows.slice().sort((a, b) => {
    if (sortBy.value === 'name_asc') return String(a.name || '').localeCompare(String(b.name || ''))
    if (sortBy.value === 'wins_desc') return (b.games_won || 0) - (a.games_won || 0)
    if (sortBy.value === 'bid_desc') return bidRate(b) - bidRate(a)
    return (b.total_score || 0) - (a.total_score || 0)
  })

  return rows
})

function openCreate() {
  editingPlayer.value = null
  form.value = { name: '', avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)] }
  formDialog.value = true
}
function openEdit(player) {
  editingPlayer.value = player
  form.value = { name: player.name, avatar_color: player.avatar_color }
  formDialog.value = true
}
function confirmDelete(player) {
  deletingPlayer.value = player
  deleteDialog.value   = true
}

async function openAnalytics(player) {
  analyticsDialog.value = true
  analyticsLoading.value = true
  analytics.value = null
  try {
    const res = await playersAPI.analytics(player.id)
    analytics.value = res.data
  } finally {
    analyticsLoading.value = false
  }
}

async function fetchPlayers() {
  loading.value = true
  try {
    const res = await playersAPI.getAll()
    players.value = res.data
  } finally { loading.value = false }
}

async function savePlayer() {
  if (!form.value.name?.trim()) return
  saving.value = true
  try {
    if (editingPlayer.value) {
      await playersAPI.update(editingPlayer.value.id, form.value)
      store.notify(`${form.value.name} updated!`)
    } else {
      await playersAPI.create(form.value)
      store.notify(`${form.value.name} added!`)
    }
    formDialog.value = false
    await fetchPlayers()
  } finally { saving.value = false }
}

async function deletePlayer() {
  saving.value = true
  try {
    await playersAPI.remove(deletingPlayer.value.id)
    store.notify(`${deletingPlayer.value.name} deleted`, 'warning')
    deleteDialog.value = false
    await fetchPlayers()
  } finally { saving.value = false }
}

onMounted(fetchPlayers)
</script>

<style scoped>

.player-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.players-search {
  flex: 1 1 320px;
  min-width: 240px;
}

.players-select {
  flex: 0 1 220px;
  min-width: 180px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
  text-align: center;
}

.stat-item {
  padding: 8px 4px;
  background: var(--st-bg-soft);
  border: 1px solid var(--st-panel-border);
  border-radius: 10px;
}

.player-preview {
  border-radius: 10px;
}

.analytics-list {
  display: grid;
  gap: 14px;
}

.analytics-row {
  padding: 12px;
  border-radius: 14px;
  background: rgba(var(--st-primary-rgb), 0.04);
  border: 1px solid rgba(var(--st-primary-rgb), 0.1);
}

.analytics-games-table thead tr th {
  background: rgba(var(--st-primary-rgb), 0.05) !important;
  color: rgba(var(--v-theme-on-surface), 0.58) !important;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.color-selected {
  box-shadow: 0 0 0 2px rgba(var(--st-primary-rgb), 0.45) !important;
}
</style>
