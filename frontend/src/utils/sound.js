import { ref } from 'vue'

const STORAGE_KEY = 'supertrump:sound-enabled'

export const soundEnabled = ref(localStorage.getItem(STORAGE_KEY) !== 'false')

let audioContext = null
let lastTapAt = 0

function getAudioContext() {
  if (!soundEnabled.value) return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null

  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }

  return audioContext
}

function playTone({ frequency, start, duration, type = 'sine', gain = 0.04 }) {
  const ctx = getAudioContext()
  if (!ctx) return

  const oscillator = ctx.createOscillator()
  const volume = ctx.createGain()
  const startAt = ctx.currentTime + start
  const endAt = startAt + duration

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  volume.gain.setValueAtTime(0.0001, startAt)
  volume.gain.exponentialRampToValueAtTime(gain, startAt + 0.012)
  volume.gain.exponentialRampToValueAtTime(0.0001, endAt)

  oscillator.connect(volume)
  volume.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

export function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  localStorage.setItem(STORAGE_KEY, String(soundEnabled.value))
  if (soundEnabled.value) playTapSound()
}

export function playTapSound() {
  const now = performance.now()
  if (now - lastTapAt < 70) return
  lastTapAt = now

  playTone({ frequency: 560, start: 0, duration: 0.045, type: 'triangle', gain: 0.025 })
  playTone({ frequency: 840, start: 0.025, duration: 0.04, type: 'sine', gain: 0.018 })
}

export function playWinnerSound() {
  const notes = [
    [523.25, 0],
    [659.25, 0.11],
    [783.99, 0.22],
    [1046.5, 0.36],
    [1318.51, 0.54],
  ]

  notes.forEach(([frequency, start], index) => {
    playTone({
      frequency,
      start,
      duration: index === notes.length - 1 ? 0.34 : 0.13,
      type: 'triangle',
      gain: index === notes.length - 1 ? 0.055 : 0.04,
    })
  })
}

export function bindTapSounds(root = document) {
  const interactiveSelector = [
    'button',
    'a[href]',
    '[role="button"]',
    '.v-btn',
    '.v-list-item',
    '.cursor-pointer',
    '.player-chip',
    '.mini-card',
    '.joker-card',
    '.round-row',
  ].join(',')

  function onPointerUp(event) {
    if (!soundEnabled.value || event.defaultPrevented) return
    if (event.target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (!event.target?.closest(interactiveSelector)) return
    playTapSound()
  }

  root.addEventListener('pointerup', onPointerUp, true)
  return () => root.removeEventListener('pointerup', onPointerUp, true)
}
