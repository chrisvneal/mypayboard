export type HeaderVisual = {
  bg: string
  title: string
  subtitle: string
  caption: string
  avatarBg: string
  avatarFg: string
  menu: string
}

export const HEADER_COLOR_SWATCHES = [
  {
    label: 'Blue',
    value: '#B8D4F0',
    title: '#0c3d6e',
    subtitle: '#185FA5',
    caption: '#185FA5',
    avatarBg: '#9FC5EB',
    avatarFg: '#0c3d6e',
    menu: '#185FA5',
  },
  {
    label: 'Green',
    value: '#B8E6CA',
    title: '#1a4d2e',
    subtitle: '#2a7a47',
    caption: '#2a7a47',
    avatarBg: '#96D4AD',
    avatarFg: '#1a4d2e',
    menu: '#2a7a47',
  },
  {
    label: 'Gold',
    value: '#F0D998',
    title: '#5c4208',
    subtitle: '#7a5a0c',
    caption: '#7a5a0c',
    avatarBg: '#E8C878',
    avatarFg: '#5c4208',
    menu: '#7a5a0c',
  },
  {
    label: 'Rose',
    value: '#F5C4D4',
    title: '#6b2038',
    subtitle: '#9a3050',
    caption: '#9a3050',
    avatarBg: '#E8A8BC',
    avatarFg: '#6b2038',
    menu: '#9a3050',
  },
  {
    label: 'Lavender',
    value: '#D4B8F0',
    title: '#4a2870',
    subtitle: '#6b3d9a',
    caption: '#6b3d9a',
    avatarBg: '#C0A0E8',
    avatarFg: '#4a2870',
    menu: '#6b3d9a',
  },
  {
    label: 'Slate',
    value: '#D4D8DE',
    title: '#1e293b',
    subtitle: '#334155',
    caption: '#475569',
    avatarBg: '#B8BEC8',
    avatarFg: '#1e293b',
    menu: '#334155',
  },
] as const

/** Maps older pale header colors to the current saturated palette */
const LEGACY_BG_MAP: Record<string, string> = {
  '#E6F1FB': '#B8D4F0',
  '#E8F7EE': '#B8E6CA',
  '#FFF8E7': '#F0D998',
  '#FEF3C7': '#F0D998',
  '#FDE8EF': '#F5C4D4',
  '#F3E8FF': '#D4B8F0',
  '#F1F5F9': '#D4D8DE',
}

const PAID_VISUAL: HeaderVisual = {
  bg: '#B8E6CA',
  title: '#1a4d2e',
  subtitle: '#2a7a47',
  caption: '#2a7a47',
  avatarBg: '#96D4AD',
  avatarFg: '#1a4d2e',
  menu: '#2a7a47',
}

const DROP_VISUAL: HeaderVisual = {
  bg: '#D4D8DE',
  title: '#1e293b',
  subtitle: '#334155',
  caption: '#475569',
  avatarBg: '#B8BEC8',
  avatarFg: '#1e293b',
  menu: '#334155',
}

function normalizeHex(hex: string): string {
  return hex.trim().toUpperCase()
}

function swatchToVisual(swatch: (typeof HEADER_COLOR_SWATCHES)[number]): HeaderVisual {
  return {
    bg: swatch.value,
    title: swatch.title,
    subtitle: swatch.subtitle,
    caption: swatch.caption,
    avatarBg: swatch.avatarBg,
    avatarFg: swatch.avatarFg,
    menu: swatch.menu,
  }
}

export function defaultHeaderVisual(ownerId: string): HeaderVisual {
  if (ownerId === 'user-chris') return swatchToVisual(HEADER_COLOR_SWATCHES[0])
  if (ownerId === 'user-nicole') return swatchToVisual(HEADER_COLOR_SWATCHES[1])
  return swatchToVisual(HEADER_COLOR_SWATCHES[5])
}

function findSwatchVisual(bg: string): HeaderVisual | null {
  const normalized = normalizeHex(bg)
  const mapped = LEGACY_BG_MAP[normalized] ?? bg
  const match = HEADER_COLOR_SWATCHES.find(s => normalizeHex(s.value) === normalizeHex(mapped))
  return match ? swatchToVisual(match) : null
}

/** Tab count badges — tinted to match the module header palette */
export function headerTabBadgeStyle(visual: HeaderVisual): {
  backgroundColor: string
  color: string
} {
  return {
    backgroundColor: visual.avatarBg,
    color: visual.subtitle,
  }
}

export function resolveHeaderVisual(options: {
  headerColor?: string
  ownerId: string
  allPaid?: boolean
  highlightDrop?: boolean
}): HeaderVisual {
  const { headerColor, ownerId, allPaid, highlightDrop } = options

  if (highlightDrop) return DROP_VISUAL
  if (allPaid) return PAID_VISUAL
  if (!headerColor) return defaultHeaderVisual(ownerId)

  return findSwatchVisual(headerColor) ?? { ...defaultHeaderVisual(ownerId), bg: headerColor }
}
