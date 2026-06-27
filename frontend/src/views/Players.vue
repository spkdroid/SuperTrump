<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Players</h1>
        <p class="text-medium-emphasis text-body-2 mt-1">
          {{ players.length }} registered player{{ players.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-account-plus" rounded="lg" @click="openCreate">
        Add Player
      </v-btn>
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

    <!-- Player Grid -->
    <v-row v-else>
      <v-col
        v-for="player in players"
        :key="player.id"
        cols="12" sm="6" md="4" lg="3"
      >
        <v-card
          color="surface"
          rounded="xl"
          elevation="0"
          class="player-card pa-5"
          style="border: 1px solid rgba(74,222,128,0.12);"
        >
          <!-- Avatar + Actions -->
          <div class="d-flex align-start justify-space-between mb-4">
            <v-avatar :color="player.avatar_color" size="56" rounded="xl">
              <span class="font-weight-black text-h6" style="color: rgba(0,0,0,0.7);">
                {{ initials(player.name) }}
              </span>
            </v-avatar>
            <div>
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
            height="4"
            class="mt-4"
          />
          <div class="d-flex justify-space-between mt-1">
            <span class="text-caption text-medium-emphasis">Win rate</span>
            <span class="text-caption text-primary">{{ winRate(player) }}%</span>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Create / Edit Dialog ────────────────────────────── -->
    <v-dialog v-model="formDialog" max-width="440" persistent>
      <v-card color="surface" rounded="xl">
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
              :style="form.avatar_color === color ? 'outline: 3px solid white;' : ''"
              @click="form.avatar_color = color"
            >
              <v-icon v-if="form.avatar_color === color" size="16">mdi-check</v-icon>
            </v-btn>
          </div>
          <!-- Preview -->
          <div class="d-flex align-center gap-3 pa-3 rounded-lg"
            style="background: rgba(74,222,128,0.06);">
            <v-avatar :color="form.avatar_color" size="40" rounded="lg">
              <span class="font-weight-bold" style="color: rgba(0,0,0,0.7);">
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

    <!-- ── Delete Confirm ─────────────────────────────────── -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card color="surface" rounded="xl">
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
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { playersAPI } from '@/api'
import { useAppStore } from '@/store'

const store   = useAppStore()
const loading = ref(true)
const saving  = ref(false)
const players = ref([])

const formDialog     = ref(false)
const deleteDialog   = ref(false)
const editingPlayer  = ref(null)
const deletingPlayer = ref(null)

const avatarColors = [
  '#E91E63','#9C27B0','#3F51B5','#2196F3','#00BCD4',
  '#4CAF50','#FF9800','#F44336','#009688','#FF5722',
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
.player-card { transition: transform 0.2s, box-shadow 0.2s; }
.player-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(74,222,128,0.08) !important; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}
.stat-item { padding: 8px 4px; background: rgba(255,255,255,0.03); border-radius: 8px; }
</style>
