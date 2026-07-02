<template>
  <div class="partner-card-face" :class="{ joker: card?.isJoker }" :style="wrapperStyle">
    <img :src="src" :alt="card?.title || card?.label || 'Card'" class="partner-card-img" />
    <div class="partner-card-caption">{{ card?.title || card?.label }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { buildPartnerCardSvg } from '@/utils/cards'

const props = defineProps({
  card: { type: Object, required: true },
  size: { type: Number, default: 86 },
})

const src = computed(() => buildPartnerCardSvg(props.card, props.size))
const wrapperStyle = computed(() => ({
  width: `${props.size}px`,
}))
</script>

<style scoped>
.partner-card-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.partner-card-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 14px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16);
}

.partner-card-caption {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  color: var(--st-text-muted);
  font-weight: 700;
}

.joker .partner-card-caption {
  color: #7c3aed;
}
</style>
