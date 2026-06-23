import type { User } from '@/lib/types'

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

// Deeper/richer gradient endpoints for each swatch — same hue, more saturated
const GRADIENT_ENDPOINTS: Record<string, string> = {
  '#B8D4F0': '#6BA8D9',  // Blue
  '#B8E6CA': '#6CC99A',  // Green
  '#F0D998': '#D4A83E',  // Gold
  '#F5C4D4': '#E08AAF',  // Rose
  '#D4B8F0': '#A87EDB',  // Lavender
  '#D4D8DE': '#94A3B8',  // Slate
  '#D9CFC0': '#A8896C',  // Brown
  '#CBBAD4': '#9370A8',  // Plum
  '#C5CED8': '#849DB5',  // Mist
  '#E6DDD0': '#C2A882',  // Sand
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

// ─── Gradient serialization ───────────────────────────────────────────────────

/**
 * Parse a headerColor string that is either a plain hex (`"#B8D4F0"`) or the
 * pipe-serialized gradient format (`"#B8D4F0|45"`).  A plain hex is treated as
 * gradient 0 — fully backward-compatible with existing saved data.
 */
export function parseHeaderColor(s?: string): { color: string; gradient: number } {
  if (!s) return { color: '', gradient: 0 }
  const pipeIdx = s.indexOf('|')
  if (pipeIdx === -1) return { color: s, gradient: 0 }
  const color = s.slice(0, pipeIdx)
  const gradient = Math.max(0, Math.min(100, parseInt(s.slice(pipeIdx + 1), 10) || 0))
  return { color, gradient }
}

/**
 * Serialize a color + gradient value into the stored string format.
 * Returns the plain hex when gradient is 0 (keeps old format for zero-gradient saves).
 */
export function serializeHeaderColor(color: string, gradient: number): string {
  if (gradient <= 0) return color
  return `${color}|${Math.round(gradient)}`
}

/** Returns the gradient endpoint hex for a swatch color, or null if not found. */
export function getSwatchGradientEndpoint(color: string): string | null {
  const normalized = normalizeHex(color)
  const key = Object.keys(GRADIENT_ENDPOINTS).find(k => normalizeHex(k) === normalized)
  return key ? GRADIENT_ENDPOINTS[key] : null
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace('#', '')
  if (h.length !== 6) return null
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** Linear interpolate between two hex colors by factor t (0–1). */
export function lerpHex(a: string, b: string, t: number): string {
  const rgbA = hexToRgb(a)
  const rgbB = hexToRgb(b)
  if (!rgbA || !rgbB) return a
  return rgbToHex(
    rgbA[0] + (rgbB[0] - rgbA[0]) * t,
    rgbA[1] + (rgbB[1] - rgbA[1]) * t,
    rgbA[2] + (rgbB[2] - rgbA[2]) * t,
  )
}

/**
 * Compute the CSS `background` value for a header given a base color, gradient
 * intensity (0–100), and the gradient endpoint color.
 *
 * Always returns a linear-gradient string (even at gradient=0) so the header
 * div's CSS `background` type never changes while the slider is dragged —
 * prevents the white flash that occurs when browsers can't interpolate between
 * a gradient and a plain hex during a CSS transition.
 */
export function computeHeaderBackground(
  color: string,
  gradient: number,
  endpointColor: string,
): string {
  const endColor = gradient <= 0 ? color : lerpHex(color, endpointColor, gradient / 100)
  return `linear-gradient(135deg, ${color} 0%, ${endColor} 100%)`
}

// ─── Visual resolution ────────────────────────────────────────────────────────

export function defaultHeaderVisual(ownerId: string, users?: User[]): HeaderVisual {
  const idx = users ? users.findIndex(u => u.id === ownerId) : -1
  if (idx >= 0) return swatchToVisual(HEADER_COLOR_SWATCHES[idx % HEADER_COLOR_SWATCHES.length])
  return swatchToVisual(HEADER_COLOR_SWATCHES[5])
}

export function isNeutralHeaderColor(headerColor?: string): boolean {
  if (!headerColor) return false
  const { color } = parseHeaderColor(headerColor)
  return normalizeHex(color) === normalizeHex(NEUTRAL_HEADER_COLOR)
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
  users?: User[]
}): HeaderVisual {
  const { headerColor, ownerId, highlightDrop, users } = options

  if (highlightDrop) return DROP_VISUAL

  const { color: baseColor, gradient } = parseHeaderColor(headerColor)

  if (!baseColor) return defaultHeaderVisual(ownerId, users)
  if (normalizeHex(baseColor) === normalizeHex(NEUTRAL_HEADER_COLOR)) return neutralHeaderVisual()

  const fallback = defaultHeaderVisual(ownerId, users)
  const normalizedBase = normalizeHex(baseColor)
  const mappedBase = LEGACY_BG_MAP[normalizedBase] ?? baseColor
  const baseVisual = findSwatchVisual(baseColor) ?? {
    ...fallback,
    bg: baseColor,
    tabActiveBg: coloredTabActiveBg(baseColor),
  }

  // Always compute gradient format when an endpoint exists so the CSS background
  // type stays consistent across all slider positions (prevents white flash on transition).
  const endpoint = getSwatchGradientEndpoint(mappedBase)
  if (endpoint) {
    return { ...baseVisual, bg: computeHeaderBackground(baseColor, gradient, endpoint) }
  }

  return baseVisual
}
