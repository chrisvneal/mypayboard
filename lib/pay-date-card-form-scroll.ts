/** Matches scroll-margin-bottom on the add-card form host in globals.css */
export const PAY_DATE_CARD_FORM_VIEWPORT_MARGIN = 32

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
function scrollDownToRevealBottom(el: HTMLElement, margin: number) {
  const rect = el.getBoundingClientRect()
  const viewportBottom = window.innerHeight - margin
  if (rect.bottom <= viewportBottom) return

  const delta = rect.bottom - viewportBottom
  const container = findScrollContainer(el)

  if (container === document.documentElement) {
    window.scrollBy({ top: delta, left: 0, behavior: 'instant' })
    return
  }

  container.scrollTop += delta
}

export function scrollPayDateCardFormHostIntoView(anchor: HTMLElement | null) {
  if (!anchor) return
  const target = resolvePayDateCardFormScrollTarget(anchor)
  scrollDownToRevealBottom(target, PAY_DATE_CARD_FORM_VIEWPORT_MARGIN)
}

/** Scroll add-card host on next frame after layout (form mount or expand). */
export function scrollPayDateCardFormHostOnNextFrame(
  getAnchor: () => HTMLElement | null
) {
  window.requestAnimationFrame(() => {
    scrollPayDateCardFormHostIntoView(getAnchor())
  })
}
