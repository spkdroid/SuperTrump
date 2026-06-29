<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="680"
    persistent
  >
    <v-card color="surface" rounded="xl" style="display:flex; flex-direction:column; max-height:90vh; overflow:hidden;">
      <v-card-title class="pa-5 pb-0 d-flex align-center">
        <v-icon :color="lastRound ? 'warning' : 'primary'" class="mr-2">mdi-plus-circle</v-icon>
        Record Round {{ (game?.current_round ?? 0) + 1 }}
        <v-chip v-if="lastRound" color="warning" size="x-small" label class="ml-2">
          🏁 LAST ROUND
        </v-chip>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <!-- Stepper -->
      <v-stepper v-model="step" flat color="surface" class="bg-transparent" style="flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden;">
        <v-stepper-header class="px-5 pt-2" style="box-shadow: none;">
          <v-stepper-item :value="1" title="Bid"    :complete="step > 1" color="primary" />
          <v-divider />
          <v-stepper-item :value="2" title="Teams"  :complete="step > 2" color="primary" />
          <v-divider />
          <v-stepper-item :value="3" title="Result" :complete="step > 3" color="primary" />
          <v-divider />
          <v-stepper-item :value="4" title="Confirm" color="primary" />
        </v-stepper-header>

        <v-stepper-window style="flex:1; min-height:0; overflow-y:auto;">
          <!-- ── Step 1: Bid Details ──────────────────────── -->
          <v-stepper-window-item :value="1">
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

              <!-- ── Partner Cards Picker ─────────────────── -->
              <div class="mt-5">
                <div class="d-flex align-center mb-2">
                  <span class="text-subtitle-2 text-medium-emphasis">Partner Card(s) Asked</span>
                  <v-chip size="x-small" class="ml-2"
                    :color="form.partnerCards.length ? 'primary' : undefined">
                    {{ form.partnerCards.length }}&nbsp;/&nbsp;{{ form.partnerCards.includes('JOKER') ? 1 : 2 }}
                  </v-chip>
                  <v-spacer />
                  <v-btn v-if="form.partnerCards.length" variant="text" size="x-small"
                    color="error" @click="form.partnerCards = []">Clear</v-btn>
                </div>

                <!-- Joker -->
                <div class="d-flex justify-center mb-3">
                  <div
                    class="joker-card"
                    :class="{
                      'pc-selected': form.partnerCards.includes('JOKER'),
                      'pc-disabled': !form.partnerCards.includes('JOKER') && isPartnerCardDisabled('JOKER'),
                    }"
                    @click="togglePartnerCard('JOKER')"
                  >
                    <div class="joker-star">★</div>
                    <div class="joker-emoji">🃏</div>
                    <div class="joker-name">SUPER TRUMP</div>
                    <v-icon v-if="form.partnerCards.includes('JOKER')" class="pc-check" size="14"
                      color="success">mdi-check-circle</v-icon>
                  </div>
                </div>

                <!-- Suit column headers -->
                <div class="cards-table">
                  <div class="rank-label-cell"></div>
                  <div v-for="s in PARTNER_SUITS" :key="s.key"
                    class="suit-header-cell" :style="{ color: s.color }">
                    {{ s.icon }}
                  </div>

                  <!-- Rank rows -->
                  <template v-for="r in PARTNER_RANKS" :key="r.key">
                    <div class="rank-label-cell">{{ r.key }}</div>
                    <div v-for="s in PARTNER_SUITS" :key="s.key">
                      <div
                        class="mini-card"
                        :class="{
                          'pc-selected': form.partnerCards.includes(`${r.key}_${s.key}`),
                          'pc-disabled': !form.partnerCards.includes(`${r.key}_${s.key}`) && isPartnerCardDisabled(`${r.key}_${s.key}`),
                        }"
                        @click="togglePartnerCard(`${r.key}_${s.key}`)"
                      >
                        <span class="mc-rank-tl" :style="{ color: s.color }">{{ r.key }}</span>
                        <span class="mc-suit"    :style="{ color: s.color }">{{ s.icon }}</span>
                        <span class="mc-rank-br" :style="{ color: s.color }">{{ r.key }}</span>
                        <v-icon v-if="form.partnerCards.includes(`${r.key}_${s.key}`)"
                          class="pc-check" size="12" color="success">mdi-check-circle</v-icon>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Selected summary chips -->
                <div v-if="form.partnerCards.length" class="mt-3 d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="id in form.partnerCards" :key="id"
                    color="primary" size="small" label closable
                    @click:close="togglePartnerCard(id)"
                  >
                    {{ partnerCardLabel(id) }}
                  </v-chip>
                </div>
              </div>

            </div>
          </v-stepper-window-item>

          <!-- ── Step 2: Teams ──────────────────────────────── -->
          <v-stepper-window-item :value="2">
            <div class="pa-5">
              <!-- Bid amount editor (editable from Teams step too) -->
              <v-card color="surface-variant" rounded="lg" class="pa-3 mb-4">
                <div class="d-flex align-center gap-2 mb-2">
                  <v-icon size="16" color="primary">mdi-gavel</v-icon>
                  <span class="text-caption font-weight-bold text-primary">BID AMOUNT</span>
                  <v-spacer />
                  <v-chip :color="bidTypeColor" label size="x-small" prepend-icon="mdi-information-outline">
                    {{ bidTypeLabel }}
                  </v-chip>
                  <v-chip
                    v-if="form.bidAmount === 56"
                    :color="form.wasUpgradedTo56 ? 'warning' : 'info'"
                    label
                    size="x-small"
                    class="cursor-pointer"
                    @click="form.wasUpgradedTo56 = !form.wasUpgradedTo56"
                  >
                    {{ form.wasUpgradedTo56 ? 'Mid-game ↑' : 'Initial bid' }}
                  </v-chip>
                </div>
                <div class="d-flex align-center gap-3 mb-2">
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
                    style="width:80px; flex-shrink:0;"
                    hide-details
                  />
                </div>
                <div class="d-flex gap-1 flex-wrap">
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
              </v-card>

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
          <v-stepper-window-item :value="3">
            <div class="pa-5">
              <!-- Bid amount editor (editable from Results step too) -->
              <v-card color="surface-variant" rounded="lg" class="pa-3 mb-4">
                <div class="d-flex align-center gap-2 mb-2">
                  <v-icon size="16" color="primary">mdi-gavel</v-icon>
                  <span class="text-caption font-weight-bold text-primary">BID AMOUNT</span>
                  <v-spacer />
                  <v-chip :color="bidTypeColor" label size="x-small" prepend-icon="mdi-information-outline">
                    {{ bidTypeLabel }}
                  </v-chip>
                  <v-chip
                    v-if="form.bidAmount === 56"
                    :color="form.wasUpgradedTo56 ? 'warning' : 'info'"
                    label
                    size="x-small"
                    class="cursor-pointer"
                    @click="form.wasUpgradedTo56 = !form.wasUpgradedTo56"
                  >
                    {{ form.wasUpgradedTo56 ? 'Mid-game ↑' : 'Initial bid' }}
                  </v-chip>
                </div>
                <div class="d-flex align-center gap-3 mb-2">
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
                    style="width:80px; flex-shrink:0;"
                    hide-details
                  />
                </div>
                <div class="d-flex gap-1 flex-wrap">
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
              </v-card>

              <!-- Mid-game bid change indicator -->
              <v-alert
                v-if="isMidgameResultChange"
                color="orange"
                variant="tonal"
                density="compact"
                rounded="lg"
                class="mb-4"
              >
                <div class="d-flex align-center gap-2">
                  <v-icon size="18">mdi-swap-horizontal</v-icon>
                  <div class="text-body-2">
                    <strong>Mid-game bid change</strong>:
                    {{ form.bidAmountOnEnterStep3 }} → {{ form.bidAmount }}
                    &nbsp;·&nbsp;
                    Win = <strong>+{{ form.bidAmount }}</strong>,
                    Loss = <strong>−{{ 2 * form.bidAmount }}</strong>,
                    Each partner = <strong>±{{ Math.floor(form.bidAmount / 2) }}</strong>
                  </div>
                </div>
              </v-alert>

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
          <v-stepper-window-item :value="4">
            <div class="pa-5">
              <div class="text-subtitle-2 text-medium-emphasis mb-4">Score Breakdown</div>

              <!-- Last Round 2× notice -->
              <v-alert
                v-if="lastRound"
                color="warning"
                variant="tonal"
                density="compact"
                rounded="lg"
                border="start"
                class="mb-4"
              >
                <div class="d-flex align-center gap-2">
                  <span style="font-size:20px">🏁</span>
                  <div class="text-body-2">
                    <strong>Last Round &mdash; All scores &times;2!</strong>
                    <div class="text-caption mt-1 text-medium-emphasis">
                      Win {{ preview?.bidderScore !== undefined && preview.bidderScore > 0 ? '+' : '' }}{{ preview?.bidderScore }}
                      &nbsp;·&nbsp; Each partner
                      {{ preview?.partnerScoreEach !== undefined && preview.partnerScoreEach > 0 ? '+' : '' }}{{ preview?.partnerScoreEach }}
                    </div>
                  </div>
                </div>
              </v-alert>

              <!-- Formula chip -->
              <v-chip
                :color="bidWon ? 'success' : 'error'"
                label
                size="small"
                class="mb-4"
              >
                {{ bidTypeLabel }} · Bid {{ form.bidAmount }}
                →
                {{ bidWon
                  ? `WIN: Bidder +${preview?.bidderScore}, Each partner +${preview?.partnerScoreEach}`
                  : `LOSS: Bidder ${preview?.bidderScore}, Each partner ${preview?.partnerScoreEach}` }}
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

const props  = defineProps({ modelValue: Boolean, game: Object, lastRound: Boolean })
const emit   = defineEmits(['update:modelValue', 'saved'])

const step   = ref(1)
const saving = ref(false)

const form = ref({
  bidderId:               null,
  bidAmount:              28,
  wasUpgradedTo56:        false,
  bidAmountOnEnterStep3:  null,
  trumpSuit:              'spades',
  partnerCards:           [],   // array of selected card IDs e.g. ['J_H', 'JOKER']
  partnerIds:             [],
  pointsWon:              0,
  notes:                  '',
})

// Reset form when dialog opens
watch(() => props.modelValue, v => {
  if (v) {
    step.value = 1
    form.value = {
      bidderId: null, bidAmount: 28, wasUpgradedTo56: false,
      bidAmountOnEnterStep3: null,
      trumpSuit: 'spades', partnerCards: [],
      partnerIds: [], pointsWon: 0, notes: '',
    }
  }
})

// Reset the "upgraded to 56" flag if the bid is moved away from 56
watch(() => form.value.bidAmount, (newVal) => {
  if (newVal !== 56) form.value.wasUpgradedTo56 = false
})

// When entering Step 3 (Result), snapshot the current bid as the baseline.
// Any change FROM that snapshot while on/after Step 3 is a "mid-game change".
// Going back to Step 1 or 2 clears the snapshot so Step 2 edits remain baseline.
watch(step, (newStep) => {
  if (newStep === 3) {
    form.value.bidAmountOnEnterStep3 = form.value.bidAmount
  } else if (newStep < 3) {
    form.value.bidAmountOnEnterStep3 = null
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

// True when the bid was changed after entering the Result step.
const isMidgameResultChange = computed(() =>
  form.value.bidAmountOnEnterStep3 !== null &&
  form.value.bidAmount !== form.value.bidAmountOnEnterStep3
)

const computedBidType = computed(() => {
  // Mid-game result-screen override takes priority over all other type detection.
  if (isMidgameResultChange.value) return 'midgame_changed'
  return getBidType(form.value.bidAmount, form.value.wasUpgradedTo56)
})

const bidTypeLabel = computed(() => BID_TYPE_LABELS[computedBidType.value] || computedBidType.value)

const bidTypeColor = computed(() => ({
  normal: 'info', honors: 'warning', initial_56: 'error', upgraded_56: 'purple', midgame_changed: 'orange',
}[computedBidType.value] || 'grey'))

const bidWon = computed(() => form.value.pointsWon >= form.value.bidAmount)

const preview = computed(() =>
  form.value.partnerIds.length >= 0
    ? calculateScores(form.value.bidAmount, computedBidType.value, bidWon.value, form.value.partnerIds.length, props.lastRound)
    : null
)

// ── Partner card picker data ───────────────────────────────────────────
const PARTNER_SUITS = [
  { key: 'S', icon: '♠', color: '#1a1a1a', name: 'Spades'   },
  { key: 'C', icon: '♣', color: '#1a1a1a', name: 'Clubs'    },
  { key: 'H', icon: '♥', color: '#DC2626', name: 'Hearts'   },
  { key: 'D', icon: '♦', color: '#DC2626', name: 'Diamonds' },
]
const PARTNER_RANKS = [
  { key: 'J',  name: 'Jack'  },
  { key: '9',  name: '9'     },
  { key: 'A',  name: 'Ace'   },
  { key: '10', name: '10'    },
  { key: 'K',  name: 'King'  },
  { key: 'Q',  name: 'Queen' },
]

function partnerCardLabel(id) {
  if (id === 'JOKER') return 'Super Trump (Joker)'
  const parts    = id.split('_')
  const rank     = parts[0]
  const suitKey  = parts[1]
  const suitName = PARTNER_SUITS.find(s => s.key === suitKey)?.name || suitKey
  const rankName = PARTNER_RANKS.find(r => r.key === rank)?.name   || rank
  return `${rankName} of ${suitName}`
}

function isPartnerCardDisabled(id) {
  // If Joker is selected, all other cards are locked
  if (form.value.partnerCards.includes('JOKER') && id !== 'JOKER') return true
  // Max 2 cards reached and this one isn’t selected
  if (form.value.partnerCards.length >= 2 && !form.value.partnerCards.includes(id)) return true
  return false
}

function togglePartnerCard(id) {
  const cards = form.value.partnerCards
  const idx   = cards.indexOf(id)
  if (idx >= 0) { cards.splice(idx, 1); return }
  if (isPartnerCardDisabled(id)) return
  if (id === 'JOKER') { form.value.partnerCards = ['JOKER']; return }
  // If Joker was previously selected, replace it
  if (cards.includes('JOKER')) { form.value.partnerCards = [id]; return }
  cards.push(id)
}

const suitOptions = [
  { value: 'spades',   icon: '♠', label: 'Spades',   color: 'grey-lighten-1', textColor: '#0F172A' },
  { value: 'hearts',   icon: '♥', label: 'Hearts',   color: 'error',          textColor: '#F87171' },
  { value: 'diamonds', icon: '♦', label: 'Diamonds', color: 'warning',        textColor: '#FBBF24' },
  { value: 'clubs',    icon: '♣', label: 'Clubs',    color: 'info',           textColor: '#1D4ED8' },
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
      partnerCardsAsked:         form.value.partnerCards.map(id => partnerCardLabel(id)).join(', '),
      notes:                     form.value.notes,
      isLastRound:               props.lastRound,
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
  background: rgba(var(--st-primary-rgb), 0.05);
  transition: all 0.15s;
  user-select: none;
}
.player-chip:hover    { background: rgba(var(--st-primary-rgb), 0.1); }
.player-chip.selected { border-color: rgb(var(--st-primary-rgb)); background: rgba(var(--st-primary-rgb), 0.16); }
.player-chip.selected-partner { border-color: #0EA5E9; background: rgba(14,165,233,0.14); }

.score-preview-table thead tr th {
  background: rgba(var(--st-primary-rgb), 0.08) !important;
  color: rgba(var(--v-theme-on-surface), 0.62) !important;
  font-size: 11px;
}

/* ─────────── Card picker ───────────────────────────────────── */
.cards-table {
  display: grid;
  grid-template-columns: 24px repeat(4, 1fr);
  gap: 5px;
  align-items: center;
  justify-items: center;
}
.suit-header-cell {
  font-size: 18px;
  text-align: center;
  font-weight: 700;
  line-height: 1;
  padding-bottom: 2px;
}
.rank-label-cell {
  font-size: 10px;
  font-weight: 700;
  color: #9CA3AF;
  text-align: right;
  padding-right: 2px;
  align-self: center;
}

/* Mini playing card */
.mini-card {
  position: relative;
  width: 100%;
  max-width: 58px;
  aspect-ratio: 5 / 7;
  border-radius: 6px;
  background: #ffffff;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 4px 3px 3px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.16);
  transition: transform 0.13s, box-shadow 0.13s, border-color 0.13s;
  user-select: none;
}
.mini-card:hover:not(.pc-disabled) {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22);
}
.mini-card.pc-selected {
  border-color: rgb(var(--st-primary-rgb));
  background: #eff6ff;
  transform: translateY(-5px);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.3);
}
.mini-card.pc-disabled {
  opacity: 0.22;
  cursor: not-allowed;
  pointer-events: none;
}
.mc-rank-tl {
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  align-self: flex-start;
  letter-spacing: -0.5px;
}
.mc-suit {
  font-size: 17px;
  line-height: 1;
}
.mc-rank-br {
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  align-self: flex-end;
  transform: rotate(180deg);
  letter-spacing: -0.5px;
}

/* Joker card */
.joker-card {
  position: relative;
  width: 130px;
  border-radius: 10px;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe, #e0f2fe);
  border: 2px solid #1D4ED8;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0 10px;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.22), 0 0 0 1px rgba(29,78,216,0.16);
  transition: transform 0.13s, box-shadow 0.13s, border-color 0.13s;
  user-select: none;
}
.joker-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.3);
}
.joker-card.pc-selected {
  border-color: #0EA5E9;
  box-shadow: 0 6px 24px rgba(14,165,233,0.34);
  transform: translateY(-5px);
}
.joker-card.pc-disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}
.joker-star  { font-size: 22px; color: #1D4ED8; line-height: 1; }
.joker-emoji { font-size: 30px; line-height: 1; }
.joker-name  {
  font-size: 10px; font-weight: 800; letter-spacing: 2.5px;
  color: #1D4ED8; text-align: center;
}
.pc-check {
  position: absolute; top: 3px; right: 3px;
}
</style>
