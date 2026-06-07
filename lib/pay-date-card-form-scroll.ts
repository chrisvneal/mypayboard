/** Matches scroll-margin-bottom on the add-card form host in globals.css */
export const PAY_DATE_CARD_FORM_VIEWPORT_MARGIN = 32

/** Keep in sync with bill panel grid-row transition in PayDateCardInlineForm. */
export const PAY_DATE_CARD_BILL_PANEL_REVEAL_MS = 150

function resolvePayDateCardFormScrollTarget(anchor: HTMLElement): HTMLElement {
  const nestedForm = anchor.querySelector('.pay-date-card-inline-form')
  if (nestedForm instanceof HTMLElement) {
    return nestedForm.parentElement ?? anchor
  }

  const ancestorForm = anchor.closest('.pay-date-card-inline-form')
  if (ancestorForm instanceof HTMLElement) {
    return ancestorForm.parentElement ?? ancestorForm
  }

  return anchor
}

function findScrollContainer(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement
  while (node) {
    const { overflowY } = window.getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return node
    }
    node = node.parentElement
  }
  return document.documentElement
}

/** Scroll down only — reveal overflow at the bottom without shifting the form upward. */
function scrollDownToRevealBottom(
  el: HTMLElement,
  margin: number,
  behavior: ScrollBehavior = 'instant'
) {
  const rect = el.getBoundingClientRect()
  const viewportBottom = window.innerHeight - margin
  if (rect.bottom <= viewportBottom) return

  const delta = rect.bottom - viewportBottom
  const container = findScrollContainer(el)

  if (container === document.documentElement) {
    window.scrollBy({ top: delta, left: 0, behavior })
    return
  }

  container.scrollTo({ top: container.scrollTop + delta, behavior })
}

function resolvePayDateCardForm(anchor: HTMLElement): HTMLElement | null {
  if (anchor.classList.contains('pay-date-card-inline-form')) return anchor
  const nested = anchor.querySelector('.pay-date-card-inline-form')
  if (nested instanceof HTMLElement) return nested
  const ancestor = anchor.closest('.pay-date-card-inline-form')
  return ancestor instanceof HTMLElement ? ancestor : null
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function projectedScrollDelta(
  form: HTMLElement,
  margin: number,
  expandBelowPx: number
): number {
  const rect = form.getBoundingClientRect()
  const viewportBottom = window.innerHeight - margin
  const projectedBottom = rect.bottom + expandBelowPx
  if (projectedBottom <= viewportBottom) return 0
  return projectedBottom - viewportBottom
}

/** Reveal the bottom of the form card (not the padded host wrapper). */
export function scrollPayDateCardFormBottomIntoView(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
) {
  if (!anchor) return
  const form = resolvePayDateCardForm(anchor)
  if (!form) return
  scrollDownToRevealBottom(form, PAY_DATE_CARD_FORM_VIEWPORT_MARGIN, behavior)
}

/**
 * Scroll in parallel with an in-form expand (bill panel).
 * Uses projected final form height so motion matches the panel reveal.
 */
export function animateScrollPayDateCardFormBottomIntoView(
  anchor: HTMLElement | null,
  options?: { durationMs?: number; expandBelowPx?: number }
): () => void {
  const durationMs = options?.durationMs ?? PAY_DATE_CARD_BILL_PANEL_REVEAL_MS
  const expandBelowPx = options?.expandBelowPx ?? 0

  const form = anchor ? resolvePayDateCardForm(anchor) : null
  if (!form) return () => {}

  const delta = projectedScrollDelta(
    form,
    PAY_DATE_CARD_FORM_VIEWPORT_MARGIN,
    expandBelowPx
  )
  if (delta <= 0) return () => {}

  const container = findScrollContainer(form)
  const startScroll =
    container === document.documentElement ? window.scrollY : container.scrollTop
  const startTime = performance.now()
  let frameId = 0
  let cancelled = false

  function tick(now: number) {
    if (cancelled) return

    const t = Math.min(1, (now - startTime) / durationMs)
    const nextScroll = startScroll + delta * easeOutCubic(t)

    if (container === document.documentElement) {
      window.scrollTo({ top: nextScroll, left: 0, behavior: 'instant' })
    } else {
      container.scrollTop = nextScroll
    }

    if (t < 1) {
      frameId = requestAnimationFrame(tick)
    }
  }

  frameId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(frameId)
  }
}

export function scrollPayDateCardFormHostIntoView(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'instant'
) {
  if (!anchor) return
  const target = resolvePayDateCardFormScrollTarget(anchor)
  scrollDownToRevealBottom(target, PAY_DATE_CARD_FORM_VIEWPORT_MARGIN, behavior)
}

/** Scroll add-card form on next frame after layout (form mount). */
export function scrollPayDateCardFormHostOnNextFrame(
  getAnchor: () => HTMLElement | null
) {
  window.requestAnimationFrame(() => {
    scrollPayDateCardFormBottomIntoView(getAnchor(), 'instant')
  })
}
