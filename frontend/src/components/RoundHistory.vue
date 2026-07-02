<template>
  <v-card color="surface" rounded="xl" elevation="0" class="st-panel">
    <v-card-title class="pa-5 pb-3 d-flex align-center">
      <v-icon color="primary" class="mr-2">mdi-history</v-icon>
      Round History
      <v-chip size="x-small" color="primary" class="ml-2" label>{{ rounds.length }}</v-chip>
    </v-card-title>

    <div v-if="!rounds.length" class="text-center pa-10 text-medium-emphasis">
      <v-icon size="48" class="mb-3 opacity-30">mdi-cards-outline</v-icon>
      <div>No rounds played yet.</div>
    </div>

    <v-table v-else density="comfortable" class="rounds-table">
      <thead>
        <tr>
          <th class="pl-5">#</th>
          <th>Bidder</th>
          <th class="text-center">Bid</th>
          <th class="text-center">Type</th>
          <th class="text-center">Trump</th>
          <th class="text-center">Points Won</th>
          <th class="text-center">Result</th>
          <th class="text-right">Bidder Δ</th>
          <th class="text-right">Partner Δ</th>
          <th class="pr-5"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="round in [...rounds].reverse()"
          :key="round.id"
          class="round-row"
          @click="expanded = expanded === round.id ? null : round.id"
        >
          <td class="pl-5 text-medium-emphasis text-body-2">{{ round.round_number }}</td>
          <td>
            <div class="d-flex align-center gap-2 py-2">
              <v-avatar :color="round.bidder_color" size="26" rounded>
                <span class="st-avatar-initial-xs">
                  {{ initials(round.bidder_name) }}
                </span>
              </v-avatar>
              <span class="text-body-2 font-weight-medium">{{ round.bidder_name }}</span>
            </div>
          </td>
          <td class="text-center">
            <v-chip size="x-small" :color="round.bid_amount >= 40 ? 'warning' : 'info'" label>
              {{ round.bid_amount }}
            </v-chip>
          </td>
          <td class="text-center">
            <v-chip size="x-small" :color="bidTypeColor(round.bid_type)" label>
              {{ BID_TYPE_LABELS[round.bid_type] || round.bid_type }}
            </v-chip>
          </td>
          <td class="text-center">
            <span :style="`color: ${suitColor(round.trump_suit)}`" class="text-subtitle-2">
              {{ suitIcon(round.trump_suit) }}
            </span>
            <span class="text-caption text-medium-emphasis ml-1">
              {{ suitLabel(round.trump_suit) }}
            </span>
          </td>
          <td class="text-center text-body-2">
            {{ round.points_won_by_bidding_team }}/{{ round.bid_amount }}
          </td>
          <td class="text-center">
            <v-chip
              :color="round.bid_won ? 'success' : 'error'"
              size="x-small"
              :prepend-icon="round.bid_won ? 'mdi-trophy' : 'mdi-close-circle'"
              label
            >
              {{ round.bid_won ? 'WON' : 'LOST' }}
            </v-chip>
          </td>
          <td class="text-right">
            <v-chip
              :color="round.bidder_score >= 0 ? 'success' : 'error'"
              size="x-small"
              label
              class="font-weight-bold"
            >
              {{ round.bidder_score >= 0 ? '+' : '' }}{{ round.bidder_score }}
            </v-chip>
          </td>
          <td class="text-right">
            <v-chip
              v-if="round.partner_score_each !== 0"
              :color="round.partner_score_each >= 0 ? 'success' : 'error'"
              size="x-small"
              label
            >
              {{ round.partner_score_each >= 0 ? '+' : '' }}{{ round.partner_score_each }} ea
            </v-chip>
            <span v-else class="text-caption text-medium-emphasis">—</span>
          </td>
          <td class="pr-5 text-right">
            <v-btn
              v-if="props.canManage"
              icon="mdi-delete-outline"
              size="x-small"
              variant="text"
              color="error"
              @click.stop="confirmDelete(round)"
            />
            <v-icon size="14" class="text-medium-emphasis ml-1">
              {{ expanded === round.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </td>
        </tr>

        <!-- Expanded detail row -->
        <tr v-if="expanded" :key="`exp-${expanded}`">
          <td :colspan="10" class="pa-0">
            <v-expand-transition>
              <div
                v-if="expanded"
                class="pa-4 mx-5 mb-3 rounded-lg round-detail-panel"
              >
                <div v-if="expandedRound" class="d-flex flex-wrap gap-3">
                  <div
                    v-for="p in expandedRound.participants"
                    :key="p.player_id"
                    class="d-flex align-center gap-2"
                  >
                    <v-chip
                      :color="p.role === 'bidder' ? 'primary' : p.team === 'bidding' ? 'success' : 'grey'"
                      size="small"
                      label
                    >
                      <v-icon start size="12">
                        {{ p.role === 'bidder' ? 'mdi-crown' : p.role === 'partner' ? 'mdi-handshake' : 'mdi-account' }}
                      </v-icon>
                      {{ p.player_name }}:
                      <strong class="ml-1">{{ p.score >= 0 ? '+' : '' }}{{ p.score }}</strong>
                    </v-chip>
                  </div>
                  <div v-if="partnerCards(expandedRound).length" class="partner-card-strip ml-2">
                    <div class="text-caption text-medium-emphasis d-flex align-center mb-2">
                      <v-icon size="14" class="mr-1">mdi-cards</v-icon>
                      Partner cards
                    </div>
                    <div class="d-flex flex-wrap gap-3">
                      <PartnerCardFace
                        v-for="card in partnerCards(expandedRound)"
                        :key="card.id"
                        :card="card"
                        :size="72"
                      />
                    </div>
                  </div>
                  <div v-if="expandedRound.notes" class="text-caption text-medium-emphasis ml-2 d-flex align-center">
                    <v-icon size="14" class="mr-1">mdi-note-text</v-icon>
                    {{ expandedRound.notes }}
                  </div>
                </div>
              </div>
            </v-expand-transition>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Delete Confirm -->
    <v-dialog v-if="props.canManage" v-model="deleteDialog" max-width="380">
      <v-card color="surface" rounded="xl">
        <v-card-title class="pa-5 pb-3">
          <v-icon color="error" class="mr-2">mdi-undo</v-icon>
          Delete Round?
        </v-card-title>
        <v-card-text class="pa-5 pt-0 text-medium-emphasis">
          Round {{ deletingRound?.round_number }} will be removed and all scores reversed.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" rounded="lg" :loading="deleting" @click="deleteRound">Undo Round</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { roundsAPI } from '@/api'
import { BID_TYPE_LABELS, SUIT_META } from '@/utils/scoring'
import { parsePartnerCards } from '@/utils/cards'
import PartnerCardFace from '@/components/PartnerCardFace.vue'

const props = defineProps({
  rounds: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: true },
})
const emit  = defineEmits(['delete'])

const expanded     = ref(null)
const deleteDialog = ref(false)
const deletingRound = ref(null)
const deleting      = ref(false)

const expandedRound = computed(() =>
  props.rounds.find(r => r.id === expanded.value)
)

function initials(n = '') { return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() }

function bidTypeColor(t) {
  return { normal: 'info', honors: 'warning', initial_56: 'error', upgraded_56: 'purple', midgame_changed: 'orange' }[t] || 'grey'
}
function suitIcon(s)  { return SUIT_META[s]?.icon  || '?' }
function suitColor(s) { return SUIT_META[s]?.color || '#9CA3AF' }
function suitLabel(s) { return SUIT_META[s]?.label || '—' }
function partnerCards(round) { return parsePartnerCards(round?.partner_cards_asked || '') }

function confirmDelete(round) {
  if (!props.canManage) return
  deletingRound.value = round
  deleteDialog.value = true
}

async function deleteRound() {
  deleting.value = true
  try {
    await roundsAPI.remove(deletingRound.value.id)
    deleteDialog.value = false
    emit('delete')
  } finally { deleting.value = false }
}
</script>

<style scoped>
.rounds-table thead tr th {
  background: rgba(var(--st-primary-rgb), 0.05) !important;
  color: rgba(var(--v-theme-on-surface), 0.62) !important;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.round-row { cursor: pointer; transition: background 0.15s; }
.round-row:hover { background: rgba(var(--st-primary-rgb), 0.05) !important; }

.round-detail-panel {
  background: rgba(var(--st-primary-rgb), 0.04);
  border: 1px solid rgba(var(--st-primary-rgb), 0.14);
}

.partner-card-strip {
  min-width: 0;
}
</style>
