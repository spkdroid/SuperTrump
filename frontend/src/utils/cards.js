const SUIT_META = {
  Spades:   { key: 'S', symbol: '♠', color: '#111827' },
  Clubs:    { key: 'C', symbol: '♣', color: '#111827' },
  Hearts:   { key: 'H', symbol: '♥', color: '#DC2626' },
  Diamonds: { key: 'D', symbol: '♦', color: '#DC2626' },
}

const RANK_ALIASES = {
  Ace: 'A',
  Jack: 'J',
  Queen: 'Q',
  King: 'K',
  '10': '10',
  '9': '9',
}

function toSvgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function normalizeLabel(label = '') {
  return String(label || '').trim()
}

export function parsePartnerCards(raw = '') {
  const text = normalizeLabel(raw)
  if (!text) return []

  return text
    .split(',')
    .map((item) => normalizeLabel(item))
    .filter(Boolean)
    .map((label) => {
      const joker = /^super trump(?:\s*\(joker\))?$/i.test(label) || /^joker$/i.test(label)
      if (joker) {
        return {
          id: 'JOKER',
          label: 'Super Trump',
          title: 'Joker',
          rank: 'JOKER',
          suit: 'STAR',
          symbol: '🃏',
          color: '#7C3AED',
          accent: '#7C3AED',
          isJoker: true,
        }
      }

      const match = label.match(/^(.+?) of (Spades|Clubs|Hearts|Diamonds)$/i)
      if (!match) {
        return {
          id: label,
          label,
          title: label,
          rank: label,
          suit: 'UNKNOWN',
          symbol: '•',
          color: '#64748B',
          accent: '#64748B',
          isJoker: false,
        }
      }

      const rankName = match[1].trim()
      const suitName = match[2]
      const suit = SUIT_META[suitName]
      const rank = RANK_ALIASES[rankName] || rankName

      return {
        id: label,
        label,
        title: `${rankName} of ${suitName}`,
        rank,
        suit: suitName,
        symbol: suit.symbol,
        color: suit.color,
        accent: suit.color,
        isJoker: false,
      }
    })
}

export function buildPartnerCardSvg(card, size = 86) {
  const isJoker = Boolean(card?.isJoker)
  const rank = normalizeLabel(card?.rank || '').toUpperCase() || '•'
  const title = isJoker ? 'JOKER' : normalizeLabel(card?.title || card?.label || '')
  const symbol = card?.symbol || '•'
  const accent = card?.accent || '#64748B'
  const bodyColor = isJoker ? '#FFFFFF' : '#FFFFFF'
  const bg = isJoker
    ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)'
  const stroke = isJoker ? '#7C3AED' : accent
  const iconColor = isJoker ? '#7C3AED' : accent
  const small = size <= 72 ? 9 : 11

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.35)}" viewBox="0 0 86 116" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fbff"/>
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${stroke}"/>
          <stop offset="100%" stop-color="${isJoker ? '#A855F7' : stroke}"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="84" height="114" rx="12" fill="url(#bg)" stroke="url(#accent)" stroke-width="2"/>
      <rect x="8" y="8" width="70" height="100" rx="9" fill="none" stroke="rgba(0,0,0,0.04)" stroke-width="1"/>
      <text x="13" y="18" font-family="Arial, Helvetica, sans-serif" font-size="${small}" font-weight="700" fill="${iconColor}">${rank}</text>
      <text x="13" y="32" font-family="Arial, Helvetica, sans-serif" font-size="${small + 2}" font-weight="700" fill="${iconColor}">${symbol}</text>
      <text x="43" y="60" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${isJoker ? 15 : 14}" font-weight="900" fill="${iconColor}">${isJoker ? '🃏' : symbol}</text>
      <text x="43" y="86" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${isJoker ? 11 : 10}" font-weight="800" fill="${isJoker ? '#5B21B6' : '#334155'}">${isJoker ? 'SUPER TRUMP' : title}</text>
      <text x="73" y="108" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${small}" font-weight="700" fill="${iconColor}" transform="rotate(180 73 108)">${rank}</text>
      <text x="73" y="94" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${small + 2}" font-weight="700" fill="${iconColor}" transform="rotate(180 73 94)">${symbol}</text>
    </svg>
  `

  return toSvgDataUri(svg)
}
