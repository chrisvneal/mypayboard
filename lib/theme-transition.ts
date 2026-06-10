/** Briefly disable CSS transitions so theme token swaps don't animate through mid-tones. */
export function suppressThemeTransitions(): void {
  const style = document.createElement('style')
  style.setAttribute('data-mypayboard-theme-guard', '')
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{transition:none!important}'
    )
  )
  document.head.appendChild(style)
  void document.documentElement.offsetHeight
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      style.remove()
    })
  })
}
