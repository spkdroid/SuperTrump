<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="680"
    persistent
  >
    <v-card color="surface" rounded="xl">
      <v-card-title class="pa-5 pb-0 d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-plus-circle</v-icon>
        Record Round {{ (game?.current_round ?? 0) + 1 }}
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <!-- Stepper -->
      <v-stepper v-model="step" flat color="surface" class="bg-transparent">
        <v-stepper-header class="px-5 pt-2" style="box-shadow: none;">
          <v-stepper-item value="1" title="Bid"    :complete="step > 1" color="primary" />
          <v-divider />
          <v-stepper-item value="2" title="Teams"  :complete="step > 2" color="primary" />
          <v-divider />
          <v-stepper-item value="3" title="Result" :complete="step > 3" color="primary" />
          <v-divider />
          <v-stepper-item value="4" title="Confirm" color="primary" />
        </v-stepper-header>

        <v-stepper-window>
          <!-- ── Step 1: Bid Details ──────────────────────── -->
          <v-stepper-window-item value="1">
            <div class="pa-5">
              <div class="text-subtitle-2 text-medium-emphasis mb-4">
                Who placed the highest bid?
              </div>

              <!-- Bidder selection -->
              <div class="player-grid mb-5">
                <div
                  v-for="p in players"
                  :key="p.id"
                  class="player-chip"
                  :class="{ selected: form.bidderId === p.id }"
                  @click="form.bidderId = p.id"
                >
                  <v-avatar :color="p.avatar_color" size="36" rounded="lg">
                    <span class="font-weight-bold" style="font-size: 11px; color: rgba(0,0,0,0.7);">
                      {{ initials(p.name) }}
                    </span>
                  </v-avatar>
                  <span class="text-caption mt-1">{{ shortName(p.name) }}</span>
                  <v-icon v-if="form.bidderId === p.id" color="primary" size="14"
                    style="position:absolute; top:4px; right:4px;">mdi-check-circle</v-icon>
                </div>
              </div>

              <!-- Bid Amount -->
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Bid Amount</div>
              <div class="d-flex align-center gap-3 mb-1">
                <v-slider
                  v-model="form.bidAmount"
                  :min="28"
                  :max="56"
                  :step="1"
                  color="primary"
                  track-color="surface-variant"
                  thumb-label
                  hide-details
                  class="flex-grow-1"
                />
                <v-text-field
                  v-model.number="form.bidAmount"
                  type="number"
                  min="28"
                  max="56"
                  variant="outlined"
                  color="primary"
                  density="compact"
                  style="width: 90px; flex-shrink: 0;"
                  hide-details
                />
              </div>
              <div class="d-flex gap-2 mb-5">
                <v-chip
                  v-for="b in [28,30,32,35,36,38,40,42,44,46,50,52,56]"
                  :key="b"
                  :color="form.bidAmount === b ? 'primary' : undefined"
                  size="x-small"
                  label
                  class="cursor-pointer"
                  @click="form.bidAmount = b"
                >{{ b }}</v-chip>
              </div>

              <!-- Bid type display + 56 toggle -->
              <div class="d-flex align-center gap-3 mb-5">
                <v-chip
                  :color="bidTypeColor"
                  label
                  size="small"
                  prepend-icon="mdi-information-outline"
                >
                  {{ bidTypeLabel }}
                </v-chip>
                <v-chip
                  v-if="form.bidAmount === 56"
                  :color="form.wasUpgradedTo56 ? 'warning' : 'info'"
                  label
                  size="small"
                  class="cursor-pointer"
                  @click="form.wasUpgradedTo56 = !form.wasUpgradedTo56"
                >
                  {{ form.wasUpgradedTo56 ? 'Mid-game upgrade ↑' : 'Initial bid' }}
                </v-chip>
              </div>

              <!-- Trump Suit -->
              <div class="text-subtitle-2 text-medium-emphasis mb-3">Trump Suit</div>
              <div class="d-flex gap-2 flex-wrap">
                <v-btn
                  v-for="suit in suitOptions"
                  :key="suit.value"
                  :color="form.trumpSuit === suit.value ? suit.color : undefined"
                  :variant="form.trumpSuit === suit.value ? 'flat' : 'outlined'"
                  size="small"
                  rounded="lg"
                  @click="form.trumpSuit = suit.value"
                >
                  <span class="mr-1" :style="`color: ${suit.textColor}`">{{ suit.icon }}</span>
                  {{ suit.label }}
                </v-btn>
              </div>

              <!-- Partner cards asked (free text) -->
              <v-text-field
                v-model="form.partnerCardsAsked"
                label="Partner card(s) asked (optional)"
                placeholder="e.g. Jack of Hearts, Joker"
                variant="outlined"
                color="primary"
                density="compact"
                class="mt-5"
                hide-details
              />
            </div>
          </v-stepper-window-item>

          <!-- ── Step 2: Teams ──────────────────────────────── -->
          <v-stepper-window-item value="2">
            <div class="pa-5">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">
                Select who is on the
                <strong class="text-primary">bidding team</strong>
                (bidder + partners)
              </div>
              <div class="text-caption text-medium-emphasis mb-4">
                Bidder: <strong>{{ bidderName }}</strong>. Select partners from the remaining players.
              </div>

              <div class="player-grid mb-5">
                <div
                  v-for="p in nonBidders"
                  :key="p.id"
                  class="player-chip"
                  :class="{ 'selected-partner': form.partnerIds.includes(p.id) }"
                  @click="togglePartner(p.id)"
                >
                  <v-avatar :color="p.avatar_color" size="36" rounded="lg">
                    <span class="font-weight-bold" style="font-size: 11px; color: rgba(0,0,0,0.7);">
                      {{ initials(p.name) }}
                    </span>
                  </v-avatar>
                  <span class="text-caption mt-1">{{ shortName(p.name) }}</span>
                  <v-icon v-if="form.partnerIds.includes(p.id)" color="success" size="14"
                    style="position:absolute; top:4px; right:4px;">mdi-handshake</v-icon>
                </div>
              </div>

              <!-- Team summary -->
              <v-card color="surface-variant" rounded="lg" class="pa-4">
                <div class="text-caption font-weight-bold text-primary mb-2">BIDDING TEAM</div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <v-chip :color="bidder?.avatar_color" size="small" label>
                    <v-icon start size="12">mdi-crown</v-icon>{{ bidderName }}
                  </v-chip>
                  <v-chip
                    v-for="id in form.partnerIds"
                    :key="id"
                    :color="playerById(id)?.avatar_color"
                    size="small"
                    label
                  >
                    <v-icon start size="12">mdi-handshake</v-icon>{{ playerById(id)?.name }}
                  </v-chip>
                </div>
                <div class="text-caption font-weight-bold text-error mb-2">OPPOSING TEAM</div>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="id in opponentIds"
                    :key="id"
                    size="small"
                    label
                  >
                    {{ playerById(id)?.name }}
                  </v-chip>
                  <span v-if="!opponentIds.length" class="text-caption text-medium-emphasis">—</span>
                </div>
              </v-card>
            </div>
          </v-stepper-window-item>

          <!-- ── Step 3: Result ──────────────────────────────── -->
          <v-stepper-window-item value="3">
            <div class="pa-5">
              <div class="text-subtitle-2 text-medium-emphasis mb-4">
                Points won by the bidding team (0–56)
              </div>
              <div class="d-flex align-center gap-3 mb-2">
                <v-slider
                  v-model="form.pointsWon"
                  :min="0"
                  :max="56"
                  :step="1"
                  color="primary"
                  track-color="surface-variant"
                  thumb-label
                  hide-details
                  class="flex-grow-1"
                />
                <v-text-field
                  v-model.number="form.pointsWon"
                  type="number"
                  min="0"
                  max="56"
                  variant="outlined"
                  color="primary"
                  density="compact"
                  style="width: 90px; flex-shrink: 0;"
                  hide-details
                />
              </div>

              <!-- Win/Loss indicator -->
              <v-alert
                :color="bidWon ? 'success' : 'error'"
                rounded="lg"
                class="my-4"
                variant="tonal"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon>{{ bidWon ? 'mdi-trophy' : 'mdi-close-circle' }}</v-icon>
                  <div>
                    <strong>{{ bidWon ? 'BID WON!' : 'BID LOST' }}</strong>
                    — {{ form.pointsWon }} pts won vs bid of {{ form.bidAmount }}
                    (need ≥ {{ form.bidAmount }})
                  </div>
                </div>
              </v-alert>

              <v-text-field
                v-model="form.notes"
                label="Notes (optional)"
                placeholder="e.g. Joker was played on round 3…"
                variant="outlined"
                color="primary"
                density="compact"
                hide-details
              />
            </div>
          </v-stepper-window-item>

          <!-- ── Step 4: Confirm / Score Preview ──────────────── -->
          <v-stepper-window-item value="4">
            <div class="pa-5">
              <div class="text-subtitle-2 text-medium-emphasis mb-4">Score Breakdown</div>

              <!-- Formula chip -->
              <v-chip
                :color="bidWon ? 'success' : 'error'"
                label
                size="small"
                class="mb-4"
              >
                {{ bidTypeLabel }} ·
                {{ form.bidAmount === 56 && form.wasUpgradedTo56 ? '3×' : '' }}
                {{ preview?.winAmount }} base →
                {{ bidWon ? 'WIN' : 'LOSS' }}
              </v-chip>

              <!-- Score table -->
              <v-table density="compact" class="score-preview-table rounded-lg mb-4">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Role</th>
                    <th class="text-right">This Round</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div class="d-flex align-center gap-2 py-1">
                        <v-avatar :color="bidder?.avatar_color" size="24" rounded>
                          <span style="font-size:8px; font-weight:700; color:rgba(0,0,0,0.7);">
                            {{ initials(bidderName) }}
                          </span>
                        </v-avatar>
                        {{ bidderName }}
                      </div>
                    </td>
                    <td><v-chip color="primary" size="x-small" label>Bidder</v-chip></td>
                    <td class="text-right">
                      <v-chip
                        :color="(preview?.bidderScore ?? 0) >= 0 ? 'success' : 'error'"
                        size="small" label class="font-weight-bold"
                      >
                        {{ (preview?.bidderScore ?? 0) >= 0 ? '+' : '' }}{{ preview?.bidderScore ?? 0 }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr v-for="pid in form.partnerIds" :key="pid">
                    <td>
                      <div class="d-flex align-center gap-2 py-1">
                        <v-avatar :color="playerById(pid)?.avatar_color" size="24" rounded>
                          <span style="font-size:8px; font-weight:700; color:rgba(0,0,0,0.7);">
                            {{ initials(playerById(pid)?.name) }}
                          </span>
                        </v-avatar>
                        {{ playerById(pid)?.name }}
                      </div>
                    </td>
                    <td><v-chip color="success" size="x-small" label>Partner</v-chip></td>
                    <td class="text-right">
                      <v-chip
                        :color="(preview?.partnerScoreEach ?? 0) >= 0 ? 'success' : 'error'"
                        size="small" label class="font-weight-bold"
                      >
                        {{ (preview?.partnerScoreEach ?? 0) >= 0 ? '+' : '' }}{{ preview?.partnerScoreEach ?? 0 }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr v-for="pid in opponentIds" :key="pid">
                    <td>
                      <div class="d-flex align-center gap-2 py-1">
                        <v-avatar size="24" rounded color="surface-variant">
                          <span style="font-size:8px; font-weight:700; color:rgba(255,255,255,0.6);">
                            {{ initials(playerById(pid)?.name) }}
                          </span>
                        </v-avatar>
                        {{ playerById(pid)?.name }}
                      </div>
                    </td>
                    <td><v-chip size="x-small" label>Opponent</v-chip></td>
                    <td class="text-right">
                      <v-chip size="small" label color="grey">+0</v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Summary -->
              <v-card color="surface-variant" rounded="lg" class="pa-3">
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>Bid amount</span><span>{{ form.bidAmount }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>Points won by bidding team</span><span>{{ form.pointsWon }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
                  <span>Bid type</span><span>{{ bidTypeLabel }}</span>
                </div>
                <div class="d-flex justify-space-between text-caption font-weight-bold mt-2">
                  <span>Result</span>
                  <v-chip :color="bidWon ? 'success' : 'error'" size="x-small" label>
                    {{ bidWon ? 'WON' : 'LOST' }}
                  </v-chip>
                </div>
              </v-card>
            </div>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>

      <!-- ── Navigation ─────────────────────────────────── -->
      <v-divider />
      <div class="pa-4 d-flex align-center">
        <v-btn v-if="step > 1" variant="text" prepend-icon="mdi-chevron-left" @click="step--">
          Back
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="step < 4"
          color="primary"
          rounded="lg"
          append-icon="mdi-chevron-right"
          :disabled="!canProceed"
          @click="step++"
        >
          Next
        </v-btn>
        <v-btn
          v-else
          color="primary"
          rounded="lg"
          prepend-icon="mdi-check"
          :loading="saving"
          @click="saveRound"
        >
          Save Round
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { gamesAPI } from '@/api'
import { getBidType, BID_TYPE_LABELS, calculateScores, SUIT_META } from '@/utils/scoring'

const props  = defineProps({ modelValue: Boolean, game: Object })
const emit   = defineEmits(['update:modelValue', 'saved'])

const step   = ref(1)
const saving = ref(false)

const form = ref({
  bidderId:          null,
  bidAmount:         28,
  wasUpgradedTo56:   false,
  trumpSuit:         'spades',
  partnerCardsAsked: '',
  partnerIds:        [],
  pointsWon:         0,
  notes:             '',
})

// Reset form when dialog opens
watch(() => props.modelValue, v => {
  if (v) {
    step.value = 1
    form.value = {
      bidderId: null, bidAmount: 28, wasUpgradedTo56: false,
      trumpSuit: 'spades', partnerCardsAsked: '',
      partnerIds: [], pointsWon: 0, notes: '',
    }
  }
})

const players   = computed(() => props.game?.players || [])
const nonBidders = computed(() => players.value.filter(p => p.id !== form.value.bidderId))
const bidder    = computed(() => players.value.find(p => p.id === form.value.bidderId))
const bidderName = computed(() => bidder.value?.name || '—')

const opponentIds = computed(() =>
  players.value
    .filter(p => p.id !== form.value.bidderId && !form.value.partnerIds.includes(p.id))
    .map(p => p.id)
)

const computedBidType = computed(() =>
  getBidType(form.value.bidAmount, form.value.wasUpgradedTo56)
)

const bidTypeLabel = computed(() => BID_TYPE_LABELS[computedBidType.value] || computedBidType.value)

const bidTypeColor = computed(() => ({
  normal: 'info', honors: 'warning', initial_56: 'error', upgraded_56: 'purple',
}[computedBidType.value] || 'grey'))

const bidWon = computed(() => form.value.pointsWon >= form.value.bidAmount)

const preview = computed(() =>
  form.value.partnerIds.length >= 0
    ? calculateScores(form.value.bidAmount, computedBidType.value, bidWon.value, form.value.partnerIds.length)
    : null
)

const suitOptions = [
  { value: 'spades',   icon: '♠', label: 'Spades',   color: 'grey-lighten-1', textColor: '#E2F4E6' },
  { value: 'hearts',   icon: '♥', label: 'Hearts',   color: 'error',          textColor: '#F87171' },
  { value: 'diamonds', icon: '♦', label: 'Diamonds', color: 'warning',        textColor: '#FBBF24' },
  { value: 'clubs',    icon: '♣', label: 'Clubs',    color: 'success',        textColor: '#4ADE80' },
  { value: 'no_trump', icon: '🚫', label: 'No Trump', color: 'grey',          textColor: '#9CA3AF' },
]

function initials(n = '') { return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }
function shortName(n = '') { return n.split(' ')[0] }
function playerById(id)   { return players.value.find(p => p.id === id) }
function togglePartner(id) {
  const idx = form.value.partnerIds.indexOf(id)
  if (idx >= 0) form.value.partnerIds.splice(idx, 1)
  else          form.value.partnerIds.push(id)
}

const canProceed = computed(() => {
  if (step.value === 1) return !!form.value.bidderId && form.value.bidAmount >= 28
  if (step.value === 2) return true   // partners optional (bidder can go solo)
  if (step.value === 3) return form.value.pointsWon >= 0
  return true
})

async function saveRound() {
  saving.value = true
  try {
    await gamesAPI.addRound(props.game.id, {
      bidderId:                  form.value.bidderId,
      bidAmount:                 form.value.bidAmount,
      bidType:                   computedBidType.value,
      trumpSuit:                 form.value.trumpSuit,
      partnerIds:                form.value.partnerIds,
      opponentIds:               opponentIds.value,
      pointsWonByBiddingTeam:    form.value.pointsWon,
      partnerCardsAsked:         form.value.partnerCardsAsked,
      notes:                     form.value.notes,
    })
    emit('saved')
  } finally { saving.value = false }
}
</script>

<style scoped>
.player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 10px;
}
.player-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  border-radius: 12px;
  cursor: pointer;
  border: 2px solid transparent;
  background: rgba(255,255,255,0.04);
  transition: all 0.15s;
  user-select: none;
}
.player-chip:hover    { background: rgba(74,222,128,0.08); }
.player-chip.selected { border-color: #4ADE80; background: rgba(74,222,128,0.12); }
.player-chip.selected-partner { border-color: #22C55E; background: rgba(34,197,94,0.12); }

.score-preview-table thead tr th {
  background: rgba(74,222,128,0.06) !important;
  color: #9CA3AF !important;
  font-size: 11px;
}
</style>
