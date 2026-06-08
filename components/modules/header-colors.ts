export type HeaderVisual = {
  bg: string
  title: string
  subtitle: string
  caption: string
  avatarBg: string
  avatarFg: string
  menu: string
  /** Active module tab fill — tinted from header on color swatches; cement gray on neutral */
  tabActiveBg: string
}

function coloredTabActiveBg(headerBg: string): string {
  // Mix toward white rather than the live module body. The active-tab chip sits on
  // the body (not the colored header), so blending with the body would bury the
  // dark header text in dark mode. A light chip keeps that text readable in both
  // themes; in light mode (white body) this is identical to the prior look.
  return `color-mix(in srgb, ${headerBg} 42%, #ffffff)`
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
  {
    label: 'Brown',
    value: '#D9CFC0',
    title: '#4a3d2e',
    subtitle: '#6b5740',
    caption: '#7a6650',
    avatarBg: '#C9B9A6',
    avatarFg: '#4a3d2e',
    menu: '#6b5740',
  },
  {
    label: 'Plum',
    value: '#CBBAD4',
    title: '#4a3048',
    subtitle: '#6b4a68',
    caption: '#7a5a78',
    avatarBg: '#B8A4C4',
    avatarFg: '#4a3048',
    menu: '#6b4a68',
  },
  {
    label: 'Mist',
    value: '#C5CED8',
    title: '#2c3a47',
    subtitle: '#4a5c6b',
    caption: '#5a6d7d',
    avatarBg: '#AEB9C6',
    avatarFg: '#2c3a47',
    menu: '#4a5c6b',
  },
  {
    label: 'Sand',
    value: '#E6DDD0',
    title: '#4a4238',
    subtitle: '#6b5f50',
    caption: '#7a6f60',
    avatarBg: '#D4C8B8',
    avatarFg: '#4a4238',
    menu: '#6b5f50',
  },
] as const

/** Default header color for newly created pay date cards (Blue swatch). */
export const DEFAULT_HEADER_COLOR = HEADER_COLOR_SWATCHES[0].value

/** Bright gold for edit-mode row chrome (pencil, left accent bar) — distinct from navy UI */
export const GOLD_EDIT_ACCENT = '#F5AF02'

/** Maps older pale header colors to the current saturated palette */
const LEGACY_BG_MAP: Record<string, string> = {
  '#E6F1FB': '#B8D4F0',
  '#E8F7EE': '#B8E6CA',
  '#FFF8E7': '#F0D998',
  '#FEF3C7': '#F0D998',
  '#FDE8EF': '#F5C4D4',
  '#F3E8FF': '#D4B8F0',
  '#F1F5F9': '#D4D8DE',
  '#E8E0D5': '#D9CFC0',
  '#E5DCE8': '#CBBAD4',
  '#D8E0E8': '#C5CED8',
  '#EDE6DC': '#E6DDD0',
}

const DROP_VISUAL: HeaderVisual = {
  bg: '#D4D8DE',
  title: '#1e293b',
  subtitle: '#334155',
  caption: '#475569',
  avatarBg: '#B8BEC8',
  avatarFg: '#1e293b',
  menu: '#334155',
  tabActiveBg: coloredTabActiveBg('#D4D8DE'),
}

/** Stored on module when user picks the neutral (first) header swatch */
export const NEUTRAL_HEADER_COLOR = '#F8FAFC'

/**
 * Neutral header maps to CSS variables (defined per theme in globals.css) instead
 * of fixed hex. The theme class swap re-resolves these instantly via the cascade,
 * so neutral headers never get stranded with the wrong theme's colors when a user
 * toggles dark/light (the module itself does not re-render on that toggle).
 */
const NEUTRAL_VISUAL: HeaderVisual = {
  bg: 'var(--neutral-header-bg)',
  title: 'var(--neutral-header-title)',
  subtitle: 'var(--neutral-header-subtitle)',
  caption: 'var(--neutral-header-caption)',
  avatarBg: 'var(--neutral-header-avatar-bg)',
  avatarFg: 'var(--neutral-header-avatar-fg)',
  menu: 'var(--neutral-header-menu)',
  tabActiveBg: 'var(--neutral-header-tab-active)',
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
    tabActiveBg: coloredTabActiveBg(swatch.value),
  }
}

export function defaultHeaderVisual(ownerId: string): HeaderVisual {
  if (ownerId === 'user-chris') return swatchToVisual(HEADER_COLOR_SWATCHES[0])
  if (ownerId === 'user-nicole') return swatchToVisual(HEADER_COLOR_SWATCHES[1])
  return swatchToVisual(HEADER_COLOR_SWATCHES[5])
}

export function isNeutralHeaderColor(headerColor?: string): boolean {
  if (!headerColor) return false
  return normalizeHex(headerColor) === normalizeHex(NEUTRAL_HEADER_COLOR)
}

export function neutralHeaderVisual(): HeaderVisual {
  return NEUTRAL_VISUAL
}

function findSwatchVisual(bg: string): HeaderVisual | null {
  const normalized = normalizeHex(bg)
  const mapped = LEGACY_BG_MAP[normalized] ?? bg
  const match = HEADER_COLOR_SWATCHES.find(s => normalizeHex(s.value) === normalizeHex(mapped))
  return match ? swatchToVisual(match) : null
}

export function resolveHeaderVisual(options: {
  headerColor?: string
  ownerId: string
  highlightDrop?: boolean
}): HeaderVisual {
  const { headerColor, ownerId, highlightDrop } = options

  if (highlightDrop) return DROP_VISUAL
  if (isNeutralHeaderColor(headerColor)) return neutralHeaderVisual()
  if (!headerColor) return defaultHeaderVisual(ownerId)

  const fallback = defaultHeaderVisual(ownerId)
  return (
    findSwatchVisual(headerColor) ?? {
      ...fallback,
      bg: headerColor,
      tabActiveBg: coloredTabActiveBg(headerColor),
    }
  )
}
