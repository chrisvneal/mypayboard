/** Keep in sync with CollapsibleEditPanel grid-row transition. */
export const COLLAPSIBLE_EDIT_PANEL_REVEAL_MS = 200

/** Matches scroll-margin-bottom on the add-card form host in globals.css */
export const PAY_DATE_CARD_FORM_VIEWPORT_MARGIN = 32

/** Breathing room below portaled dropdowns/menus after auto-scroll. */
export const PORTALED_OVERLAY_VIEWPORT_MARGIN = 72

function visibleViewportBottom(scrollContainer: HTMLElement, margin: number): number {
  if (scrollContainer === document.documentElement) {
    return window.innerHeight - margin
  }
  return scrollContainer.getBoundingClientRect().bottom - margin
}

function projectedScrollDelta(
  el: HTMLElement,
  margin: number,
  expandBelowPx: number,
  scrollContainer?: HTMLElement
): number {
  const rect = el.getBoundingClientRect()
  const viewportBottom = scrollContainer
    ? visibleViewportBottom(scrollContainer, margin)
    : window.innerHeight - margin
  const projectedBottom = rect.bottom + expandBelowPx
  if (projectedBottom <= viewportBottom) return 0
  return projectedBottom - viewportBottom
}

/**
 * Temporary bottom padding so a container can actually scroll far enough to
 * reveal content near the end of the page — without this, scrollTo/scrollBy
 * silently clamps at the container's existing max scroll position.
 */
const SCROLL_HEADROOM_BASE_ATTR = 'data-scroll-headroom-base-padding-bottom'

function headroomTarget(container: HTMLElement): HTMLElement {
  return container === document.documentElement ? document.body : container
}

function containerMaxScrollTop(container: HTMLElement): number {
  if (container === document.documentElement) {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }
  return Math.max(0, container.scrollHeight - container.clientHeight)
}

function reserveScrollHeadroom(container: HTMLElement, extraPx: number) {
  if (extraPx <= 0) return
  const target = headroomTarget(container)
  let basePadding = target.getAttribute(SCROLL_HEADROOM_BASE_ATTR)
  if (basePadding === null) {
    basePadding = window.getComputedStyle(target).paddingBottom
    target.setAttribute(SCROLL_HEADROOM_BASE_ATTR, basePadding)
  }
  const base = parseFloat(basePadding) || 0
  target.style.paddingBottom = `${base + extraPx}px`
}

function releaseScrollHeadroom(container: HTMLElement | null) {
  if (!container) return
  const target = headroomTarget(container)
  const basePadding = target.getAttribute(SCROLL_HEADROOM_BASE_ATTR)
  if (basePadding === null) return
  target.style.paddingBottom = basePadding
  target.removeAttribute(SCROLL_HEADROOM_BASE_ATTR)
}

/** Reserve extra scroll room on the container if the target scroll position exceeds its current max. */
function reserveHeadroomForScroll(container: HTMLElement, startScroll: number, delta: number) {
  const shortfall = startScroll + delta - containerMaxScrollTop(container)
  if (shortfall > 0) reserveScrollHeadroom(container, shortfall)
}

/** Keep in sync with bill panel grid-row transition in PayDateCardInlineForm. */
export const PAY_DATE_CARD_BILL_PANEL_REVEAL_MS = 150

/** Keep in sync with module-header-edit-bleed transition in ModuleHeader. */
export const MODULE_HEADER_EDIT_REVEAL_MS = 200

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
  return resolveDashboardScrollContainer()
}

function resolveDashboardScrollContainer(): HTMLElement {
  const main = document.querySelector('main')
  if (main instanceof HTMLElement) {
    const { overflowY } = window.getComputedStyle(main)
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return main
    }
  }
  return document.documentElement
}

function resolveScrollContainerForContext(contextEl?: HTMLElement | null): HTMLElement {
  if (contextEl) {
    let node: HTMLElement | null = contextEl.parentElement
    while (node) {
      const { overflowY } = window.getComputedStyle(node)
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return node
      }
      node = node.parentElement
    }
  }
  return resolveDashboardScrollContainer()
}

/** Scroll down only — reveal overflow at the bottom without shifting the form upward. */
function scrollDownToRevealBottom(
  el: HTMLElement,
  margin: number,
  behavior: ScrollBehavior = 'smooth',
  scrollContext?: HTMLElement
) {
  const rect = el.getBoundingClientRect()
  const viewportBottom = window.innerHeight - margin
  if (rect.bottom <= viewportBottom) return

  const delta = rect.bottom - viewportBottom
  const container = scrollContext
    ? resolveScrollContainerForContext(scrollContext)
    : findScrollContainer(el)

  if (container === document.documentElement) {
    window.scrollBy({ top: delta, left: 0, behavior })
    return
  }

  container.scrollTo({ top: container.scrollTop + delta, left: 0, behavior })
}

/** Reveal a portaled overlay (select, menu, popover) when it clips below the viewport. */
export function scrollPortaledOverlayBottomIntoView(
  trigger: HTMLElement | null,
  overlay: HTMLElement | null
): (() => void) | undefined {
  if (!overlay) return
  const container = resolveScrollContainerForContext(trigger)
  const margin = PORTALED_OVERLAY_VIEWPORT_MARGIN
  const delta = projectedScrollDelta(overlay, margin, 0, container)
  if (delta <= 0) return

  return animateScrollRevealBottom(overlay, {
    durationMs: COLLAPSIBLE_EDIT_PANEL_REVEAL_MS,
    scrollContext: trigger,
    margin,
    scrollContainer: container,
  })
}

/** Quick eased correction for any residual gap once the overlay's final position settles. */
function nudgePortaledOverlayBottomGap(
  trigger: HTMLElement | null,
  overlay: HTMLElement | null
): (() => void) | undefined {
  if (!overlay) return
  const container = resolveScrollContainerForContext(trigger)
  const margin = PORTALED_OVERLAY_VIEWPORT_MARGIN
  const delta = projectedScrollDelta(overlay, margin, 0, container)
  if (delta <= 0) return

  return animateScrollRevealBottom(overlay, {
    durationMs: 100,
    scrollContext: trigger,
    margin,
    scrollContainer: container,
  })
}

function isMeasurableOverlay(overlay: HTMLElement): boolean {
  const rect = overlay.getBoundingClientRect()
  return rect.height > 0 && rect.bottom > 0
}

/**
 * Measure after layout and scroll only when the overlay bottom extends past the viewport.
 * Returns a cleanup function — call it when the overlay closes to release any temporary
 * scroll headroom that was reserved to make the reveal possible.
 */
export function schedulePortaledOverlayScroll(
  getTrigger: () => HTMLElement | null,
  getOverlay: () => HTMLElement | null
): () => void {
  let attempts = 0
  const maxAttempts = 24
  let cancelled = false
  let releaseHeadroom: () => void = () => {}

  function tryScroll() {
    if (cancelled) return
    const trigger = getTrigger()
    const overlay = getOverlay()

    if (!overlay || !isMeasurableOverlay(overlay)) {
      if (attempts++ < maxAttempts) requestAnimationFrame(tryScroll)
      return
    }

    const release = scrollPortaledOverlayBottomIntoView(trigger, overlay)
    if (release) releaseHeadroom = release

    // One follow-up correction once the overlay's Popper-computed position has
    // settled, in case it shifted slightly as a side effect of the scroll above.
    window.setTimeout(() => {
      if (cancelled) return
      const nudgeRelease = nudgePortaledOverlayBottomGap(getTrigger(), getOverlay())
      if (nudgeRelease) releaseHeadroom = nudgeRelease
    }, COLLAPSIBLE_EDIT_PANEL_REVEAL_MS + 120)
  }

  requestAnimationFrame(tryScroll)

  return () => {
    cancelled = true
    releaseHeadroom()
  }
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

function resolveModuleHeaderEditForm(anchor: HTMLElement): HTMLElement | null {
  if (anchor.classList.contains('module-header-edit-form')) return anchor
  const nested = anchor.querySelector('.module-header-edit-form')
  if (nested instanceof HTMLElement) return nested
  const ancestor = anchor.closest('.module-header-edit-form')
  return ancestor instanceof HTMLElement ? ancestor : null
}

/**
 * Scroll in parallel with an in-form expand.
 * Uses projected final form height so motion matches the panel reveal.
 */
function animateScrollRevealBottom(
  el: HTMLElement,
  options?: {
    durationMs?: number
    expandBelowPx?: number
    margin?: number
    scrollContext?: HTMLElement | null
    scrollContainer?: HTMLElement
  }
): () => void {
  const durationMs = options?.durationMs ?? PAY_DATE_CARD_BILL_PANEL_REVEAL_MS
  const expandBelowPx = options?.expandBelowPx ?? 0
  const margin = options?.margin ?? PAY_DATE_CARD_FORM_VIEWPORT_MARGIN

  const container =
    options?.scrollContainer ??
    (options?.scrollContext
      ? resolveScrollContainerForContext(options.scrollContext)
      : findScrollContainer(el))

  const delta = projectedScrollDelta(el, margin, expandBelowPx, container)
  if (delta <= 0) return () => {}
  const startScroll =
    container === document.documentElement ? window.scrollY : container.scrollTop

  reserveHeadroomForScroll(container, startScroll, delta)

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
    releaseScrollHeadroom(container)
  }
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
  const form = anchor ? resolvePayDateCardForm(anchor) : null
  if (!form) return () => {}

  return animateScrollRevealBottom(form, {
    durationMs: options?.durationMs ?? PAY_DATE_CARD_BILL_PANEL_REVEAL_MS,
    expandBelowPx: options?.expandBelowPx ?? 0,
  })
}

/** Reveal the bottom of the module header edit form after it expands. */
export function scrollModuleHeaderEditFormBottomIntoView(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
) {
  if (!anchor) return
  const form = resolveModuleHeaderEditForm(anchor)
  if (!form) return
  scrollDownToRevealBottom(form, PAY_DATE_CARD_FORM_VIEWPORT_MARGIN, behavior)
}

/**
 * Scroll in parallel with the module header edit panel reveal.
 * Uses scrollHeight while collapsed so motion matches the drop-down.
 */
export function animateScrollModuleHeaderEditFormBottomIntoView(
  anchor: HTMLElement | null,
  options?: { durationMs?: number; expandBelowPx?: number }
): () => void {
  const form = anchor ? resolveModuleHeaderEditForm(anchor) : null
  if (!form) return () => {}

  return animateScrollRevealBottom(form, {
    durationMs: options?.durationMs ?? MODULE_HEADER_EDIT_REVEAL_MS,
    expandBelowPx: options?.expandBelowPx ?? 0,
  })
}

export function scrollPayDateCardFormHostIntoView(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'instant'
) {
  if (!anchor) return
  const target = resolvePayDateCardFormScrollTarget(anchor)
  scrollDownToRevealBottom(target, PAY_DATE_CARD_FORM_VIEWPORT_MARGIN, behavior)
}

function resolveExpandedFormScrollTarget(anchor: HTMLElement): HTMLElement {
  if (anchor.classList.contains('inline-create-form-host')) {
    return resolveInlineCreateForm(anchor)
  }
  const nestedForm = anchor.querySelector('form')
  if (nestedForm instanceof HTMLElement) return nestedForm
  const firstChild = anchor.firstElementChild
  if (firstChild instanceof HTMLElement) return firstChild
  return anchor
}

/** Reveal the bottom of any expanded form when it extends below the viewport. */
export function scrollExpandedFormBottomIntoView(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
) {
  if (!anchor) return
  scrollDownToRevealBottom(
    resolveExpandedFormScrollTarget(anchor),
    PAY_DATE_CARD_FORM_VIEWPORT_MARGIN,
    behavior
  )
}

/**
 * Scroll in sync with panel open, then keep correcting as the panel's real
 * height settles (grid-row transition, nested collapsible sections, images/
 * fonts loading late) — driven by ResizeObserver instead of a fixed timer,
 * since a taller form (e.g. one with a debt-tracker sub-panel) can still be
 * growing well past a single hardcoded reveal duration.
 * Returns a cleanup function — call it when the panel closes to cancel any
 * in-flight animation, stop observing, and release temporary scroll headroom.
 */
export function scrollExpandedFormWhenOpen(getAnchor: () => HTMLElement | null): () => void {
  const anchor = getAnchor()
  if (!anchor) return () => {}
  const target = resolveExpandedFormScrollTarget(anchor)

  let cancelCurrent: () => void = () => {}
  let settleTimerId = 0

  const scrollIfNeeded = () => {
    cancelCurrent()
    cancelCurrent = animateScrollRevealBottom(target, {
      durationMs: COLLAPSIBLE_EDIT_PANEL_REVEAL_MS,
    })
  }

  const frameId = requestAnimationFrame(scrollIfNeeded)

  // Debounced so rapid resize events during the CSS transition collapse into
  // one correction once the size actually stops changing.
  const observer = new ResizeObserver(() => {
    window.clearTimeout(settleTimerId)
    settleTimerId = window.setTimeout(scrollIfNeeded, 32)
  })
  observer.observe(target)

  return () => {
    cancelAnimationFrame(frameId)
    window.clearTimeout(settleTimerId)
    observer.disconnect()
    cancelCurrent()
  }
}

/** Scroll add-card form on next frame after layout (form mount). */
export function scrollPayDateCardFormHostOnNextFrame(
  getAnchor: () => HTMLElement | null
) {
  window.requestAnimationFrame(() => {
    scrollPayDateCardFormBottomIntoView(getAnchor(), 'instant')
  })
}

function resolveInlineCreateForm(el: HTMLElement): HTMLElement {
  if (el.classList.contains('inline-create-form-host')) return el
  const nested = el.querySelector('.inline-create-form-host, .inline-create-form')
  return nested instanceof HTMLElement ? nested : el
}

/** Reveal the bottom of any inline create form (master list add bill/income, etc.). */
export function scrollInlineCreateFormBottomIntoView(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
) {
  scrollExpandedFormBottomIntoView(anchor, behavior)
}

/** Scroll inline create form on next frame after layout (one-shot; no resize loop). */
export function scrollInlineCreateFormOnNextFrame(getAnchor: () => HTMLElement | null): () => void {
  const frameId = window.requestAnimationFrame(() => {
    scrollInlineCreateFormBottomIntoView(getAnchor(), 'smooth')
  })
  return () => window.cancelAnimationFrame(frameId)
}

/** Keep in sync with CategoryGroup's grid-row collapse transition. */
export const CATEGORY_GROUP_COLLAPSE_MS = 200

/**
 * Ease scrollTop down toward the new max in sync with a collapsing section,
 * instead of letting the browser hard-clamp it once content shrinks past
 * the current scroll position (the "snap to top" jolt).
 */
export function animateScrollCompensateForCollapse(
  container: HTMLElement | null,
  durationMs: number = CATEGORY_GROUP_COLLAPSE_MS
): () => void {
  if (!container) return () => {}
  const el = container

  const startScrollTop = el.scrollTop
  const startTime = performance.now()
  let frameId = 0
  let cancelled = false

  function tick(now: number) {
    if (cancelled) return

    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
    if (startScrollTop > maxScrollTop) {
      const t = Math.min(1, (now - startTime) / durationMs)
      el.scrollTop = startScrollTop + (maxScrollTop - startScrollTop) * easeOutCubic(t)
    }

    if (now - startTime < durationMs) {
      frameId = requestAnimationFrame(tick)
    }
  }

  frameId = requestAnimationFrame(tick)

  return () => {
    cancelled = true
    cancelAnimationFrame(frameId)
  }
}
