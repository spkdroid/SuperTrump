<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Games</h1>
        <p class="text-medium-emphasis text-body-2 mt-1">
          {{ activeCount }} active · {{ completedCount }} completed
        </p>
      </div>
      <v-spacer />
      <v-btn-toggle v-model="filter" density="compact" rounded="lg" color="primary" class="mr-3">
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="active" size="small">Active</v-btn>
        <v-btn value="completed" size="small">Completed</v-btn>
      </v-btn-toggle>
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" @click="createDialog = true">
        New Game
      </v-btn>
    </div>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="56" />
    </div>

    <div v-else-if="!filteredGames.length" class="text-center py-16 text-medium-emphasis">
      <v-icon size="72" class="mb-4 opacity-30">mdi-cards-outline</v-icon>
      <div class="text-h6">No games found</div>
      <v-btn class="mt-4" color="primary" rounded="lg" @click="createDialog = true">
        Create First Game
      </v-btn>
    </div>

    <v-row v-else>
      <v-col
        v-for="game in filteredGames"
        :key="game.id"
        cols="12" sm="6" lg="4"
      >
        <v-card
          color="surface"
          rounded="xl"
          elevation="0"
          class="game-card"
          style="border: 1px solid rgba(74,222,128,0.12); cursor: pointer;"
          @click="$router.push(`/games/${game.id}`)"
        >
          <!-- Card Header -->
          <div class="pa-5 pb-3 d-flex align-start">
            <div class="flex-grow-1">
              <div class="d-flex align-center gap-2 mb-1">
                <span class="text-subtitle-1 font-weight-bold">{{ game.name }}</span>
                <v-chip
                  :color="game.status === 'active' ? 'success' : 'grey'"
                  size="x-small"
                  :prepend-icon="game.status === 'active' ? 'mdi-circle' : 'mdi-check-circle'"
                  label
                >
                  {{ game.status === 'active' ? 'LIVE' : 'DONE' }}
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ game.num_players }} players · Round {{ game.current_round }} ·
                {{ fmtDate(game.created_at) }}
              </div>
            </div>
            <v-btn
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              color="error"
              @click.stop="confirmDelete(game)"
            />
          </div>

          <!-- Score bar – top 3 players -->
          <div class="px-5 pb-3">
            <div
              v-for="(player, idx) in topOf(game.players)"
              :key="player.id"
              class="d-flex align-center mb-2"
            >
              <v-icon
                :color="['secondary','grey-lighten-2','amber-darken-3'][idx]"
                size="14"
                class="mr-2"
              >
                {{ idx === 0 ? 'mdi-crown' : 'mdi-minus' }}
              </v-icon>
              <v-avatar :color="player.avatar_color" size="20" class="mr-2">
                <span style="font-size: 8px; font-weight: 700; color: rgba(0,0,0,0.7);">
                  {{ initials(player.name) }}
                </span>
              </v-avatar>
              <span class="text-caption flex-grow-1">{{ player.name }}</span>
              <v-chip
                :color="player.current_score >= 0 ? 'success' : 'error'"
                size="x-small"
                label
              >
                {{ player.current_score >= 0 ? '+' : '' }}{{ player.current_score }}
              </v-chip>
            </div>
          </div>

          <!-- Avatar row -->
          <v-divider />
          <div class="pa-4 d-flex align-center">
            <div class="d-flex">
              <v-avatar
                v-for="p in (game.players || []).slice(0, 5)"
                :key="p.id"
                :color="p.avatar_color"
                size="28"
                class="ml-n2"
                style="border: 2px solid #111A11;"
              >
                <span style="font-size: 9px; font-weight: 700; color: rgba(0,0,0,0.7);">
                  {{ initials(p.name) }}
                </span>
              </v-avatar>
              <v-avatar
                v-if="(game.players || []).length > 5"
                color="surface-variant"
                size="28"
                class="ml-n2"
                style="border: 2px solid #111A11;"
              >
                <span style="font-size: 9px;">+{{ game.players.length - 5 }}</span>
              </v-avatar>
            </div>
            <v-spacer />
            <v-btn
              :color="game.status === 'active' ? 'primary' : 'grey'"
              size="small"
              variant="tonal"
              rounded="lg"
              append-icon="mdi-chevron-right"
              @click.stop="$router.push(`/games/${game.id}`)"
            >
              {{ game.status === 'active' ? 'Play' : 'View' }}
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Create Game Dialog ─────────────────────────────── -->
    <v-dialog v-model="createDialog" max-width="520" persistent>
      <v-card color="surface" rounded="xl">
        <v-card-title class="pa-5 pb-3 d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-cards-outline</v-icon>
          Create New Game
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="createDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="newGame.name"
            label="Game Name (optional)"
            variant="outlined"
            color="primary"
            placeholder="e.g. Friday Night Game"
            class="mb-4"
          />
          <div class="text-body-2 font-weight-medium mb-3">
            Select Players
            <v-chip size="x-small" color="primary" class="ml-2">
              {{ newGame.playerIds.length }} selected
            </v-chip>
          </div>
          <div v-if="!allPlayers.length" class="text-center py-4 text-medium-emphasis text-body-2">
            No players found.
            <router-link to="/players" class="text-primary">Add players first.</router-link>
          </div>
          <v-row v-else dense>
            <v-col
              v-for="p in allPlayers"
              :key="p.id"
              cols="12" sm="6"
            >
              <v-card
                :color="newGame.playerIds.includes(p.id) ? 'primary' : 'surface-variant'"
                rounded="lg"
                elevation="0"
                class="pa-3 d-flex align-center gap-3"
                style="cursor: pointer;"
                @click="togglePlayer(p.id)"
              >
                <v-avatar :color="p.avatar_color" size="32">
                  <span class="font-weight-bold" style="font-size: 11px; color: rgba(0,0,0,0.7);">
                    {{ initials(p.name) }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="text-body-2 font-weight-medium"
                    :class="newGame.playerIds.includes(p.id) ? 'text-on-primary' : ''">
                    {{ p.name }}
                  </div>
                </div>
                <v-icon
                  v-if="newGame.playerIds.includes(p.id)"
                  color="on-primary"
                  size="18"
                >mdi-check-circle</v-icon>
              </v-card>
            </v-col>
          </v-row>
          <div v-if="newGame.playerIds.length > 0 && newGame.playerIds.length < 3"
            class="text-caption text-error mt-2">
            Minimum 3 players required.
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            rounded="lg"
            :loading="saving"
            :disabled="newGame.playerIds.length < 3"
            @click="createGame"
          >
            Start Game
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card color="surface" rounded="xl">
        <v-card-title class="pa-5 pb-3">
          <v-icon color="error" class="mr-2">mdi-delete-outline</v-icon>
          Delete Game?
        </v-card-title>
        <v-card-text class="pa-5 pt-0 text-medium-emphasis">
          Delete <strong class="text-on-surface">{{ deletingGame?.name }}</strong>?
          All rounds and scores will be lost.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" rounded="lg" :loading="saving" @click="deleteGame">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { gamesAPI, playersAPI } from '@/api'
import { useAppStore } from '@/store'
import { useRouter } from 'vue-router'

const store  = useAppStore()
const router = useRouter()

const loading      = ref(true)
const saving       = ref(false)
const games        = ref([])
const allPlayers   = ref([])
const filter       = ref('all')
const createDialog = ref(false)
const deleteDialog = ref(false)
const deletingGame = ref(null)

const newGame = ref({ name: '', playerIds: [] })

const filteredGames = computed(() => {
  if (filter.value === 'active')    return games.value.filter(g => g.status === 'active')
  if (filter.value === 'completed') return games.value.filter(g => g.status === 'completed')
  return games.value
})
const activeCount    = computed(() => games.value.filter(g => g.status === 'active').length)
const completedCount = computed(() => games.value.filter(g => g.status === 'completed').length)

function initials(n = '') { return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }
function fmtDate(d)       { return new Date(d).toLocaleDateString() }
function topOf(players)   { return (players || []).slice().sort((a,b) => b.current_score - a.current_score).slice(0,3) }

function togglePlayer(id) {
  const idx = newGame.value.playerIds.indexOf(id)
  if (idx >= 0) newGame.value.playerIds.splice(idx, 1)
  else          newGame.value.playerIds.push(id)
}

function confirmDelete(game) { deletingGame.value = game; deleteDialog.value = true }

async function fetchGames() {
  loading.value = true
  try {
    const [gRes, pRes] = await Promise.all([gamesAPI.getAll(), playersAPI.getAll()])
    games.value      = gRes.data
    allPlayers.value = pRes.data
  } finally { loading.value = false }
}

async function createGame() {
  saving.value = true
  try {
    const res = await gamesAPI.create(newGame.value)
    store.notify(`Game "${res.data.name}" created!`)
    createDialog.value = false
    newGame.value = { name: '', playerIds: [] }
    router.push(`/games/${res.data.id}`)
  } finally { saving.value = false }
}

async function deleteGame() {
  saving.value = true
  try {
    await gamesAPI.remove(deletingGame.value.id)
    store.notify('Game deleted', 'warning')
    deleteDialog.value = false
    await fetchGames()
  } finally { saving.value = false }
}

onMounted(fetchGames)
</script>

<style scoped>
.game-card { transition: transform 0.2s; }
.game-card:hover { transform: translateY(-2px); }
</style>
