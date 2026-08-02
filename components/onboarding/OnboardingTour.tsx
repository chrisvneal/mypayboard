'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { EVENTS, Joyride, type EventData, type Step, type TooltipRenderProps } from 'react-joyride'
import type { PayDateCard } from '@/lib/types'
import { useUserPrefs } from '@/lib/UserPrefsProvider'

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="pay-date-card"]',
    placement: 'auto',
    title: 'Organize bills by paycheck',
    content:
      'Each Pay Date Card groups the bills that need to be paid from this paycheck before the next one arrives.',
  },
  {
    target: '[data-tour="add-bill-button"]',
    placement: 'auto',
    title: "Let's add a bill",
    content: 'Choose a bill from your bill list to add to this paycheck.',
  },
  {
    target: '[data-tour="remaining-balance"]',
    placement: 'auto',
    title: "That's it!",
    content: 'Your remaining balance updates instantly as you plan each paycheck.',
  },
]

// Index of the one step that isn't advanced by a button — it waits for the
// user to actually add a bill (see the bill-count watcher effect below).
const WAIT_FOR_ACTION_STEP_INDEX = 1

export type OnboardingTourProps = {
  /** The seeded Pay Date Card to anchor the tour to. Undefined = nothing to tour, don't run. */
  card: PayDateCard | undefined
}

/**
 * Lightweight coach-mark tour (Claude Desktop feature-announcement style,
 * not Joyride's default dimmed spotlight overlay) for a first-time user's
 * seeded Pay Date Card. Only ever fires once per user — gated on
 * user_prefs.tourCompletedAt and on a seeded card actually existing (see
 * MonthlyBoard, which only renders this once `isLoaded` and a real board
 * are confirmed).
 */
export function OnboardingTour({ card }: OnboardingTourProps) {
  const { prefs, patch } = useUserPrefs()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [waitStepPickerOpen, setWaitStepPickerOpen] = useState(false)
  const hasStartedRef = useRef(false)
  const billCountAtWaitStepRef = useRef<number | null>(null)

  // Start once, the first time we see an eligible card and an unfinished
  // tour state. Intentionally does not re-evaluate `eligible` after that —
  // finishTour() below sets tourCompletedAt, which would otherwise flip
  // eligibility to false mid-tour and fight our own `run` state.
  useEffect(() => {
    if (hasStartedRef.current || !card || prefs.tourCompletedAt !== null) return
    hasStartedRef.current = true
    setStepIndex(0)
    setRun(true)
  }, [card, prefs.tourCompletedAt])

  const finishTour = useCallback(() => {
    setRun(false)
    patch({ tourCompletedAt: new Date().toISOString() })
  }, [patch])

  // While on the "Try adding a bill" step, re-anchor from the toggle button
  // to the master-list picker once it's actually open — the toggle button
  // itself never moves or resizes when the picker expands below it (it just
  // relabels Add bill -> Cancel), so Floating UI has no reason to reposition
  // unless the target element itself changes. Watching the panel's
  // data-open attribute (set by AddBillInline) rather than polling avoids
  // guessing at timing.
  useEffect(() => {
    // No initial sync needed: the picker is always closed the moment this
    // step becomes active (waitStepPickerOpen's default), so the observer
    // only has to catch the later open transition, not an initial read.
    if (!run || stepIndex !== WAIT_FOR_ACTION_STEP_INDEX) return
    const panel = document.querySelector('.add-bill-panel')
    if (!panel) return
    const observer = new MutationObserver(() => {
      setWaitStepPickerOpen(panel.getAttribute('data-open') === 'true')
    })
    observer.observe(panel, { attributes: true, attributeFilter: ['data-open'] })
    return () => observer.disconnect()
  }, [run, stepIndex])

  const steps = useMemo(
    () =>
      TOUR_STEPS.map((step, i) =>
        i === WAIT_FOR_ACTION_STEP_INDEX && waitStepPickerOpen
          ? // The tooltip itself renders null while the picker is open (see
            // TourTooltip below) — hideArrow only for this specific
            // sub-state so there's no arrow floating with no card attached.
            // Every other step keeps the normal arrow.
            { ...step, target: '[data-tour="add-bill-picker"]', floatingOptions: { hideArrow: true } }
          : step
      ),
    [waitStepPickerOpen]
  )

  // Step 2 ("Try adding a bill") has no Next button — it advances only when
  // a bill is actually added to the card, confirmed via the real
  // AddBillSection -> AddBillInline -> onBillAdd path already wired into
  // the board. This effect just watches the result of that, it doesn't
  // simulate or short-circuit the interaction itself.
  useEffect(() => {
    if (!run || stepIndex !== WAIT_FOR_ACTION_STEP_INDEX || !card) return
    if (billCountAtWaitStepRef.current === null) {
      billCountAtWaitStepRef.current = card.bills.length
      return
    }
    if (card.bills.length > billCountAtWaitStepRef.current) {
      billCountAtWaitStepRef.current = null
      setStepIndex(WAIT_FOR_ACTION_STEP_INDEX + 1)
    }
  }, [run, stepIndex, card])

  // Defensive only: if an anchor unexpectedly isn't in the DOM (shouldn't
  // happen given MonthlyBoard's gating), don't leave the user stuck with a
  // tour that can never find its target — end it cleanly instead.
  const handleEvent = useCallback(
    (data: EventData) => {
      if (data.type === EVENTS.TARGET_NOT_FOUND) {
        finishTour()
      }
    },
    [finishTour]
  )

  const TourTooltip = useMemo(() => {
    function Tooltip({ index, size, step, isLastStep, tooltipProps }: TooltipRenderProps) {
      const isWaitStep = index === WAIT_FOR_ACTION_STEP_INDEX
      // Once the picker is open, the form is compact/narrow enough that any
      // placement of a ~280px card risks landing on top of the real Add
      // button below it (confirmed — that's exactly what was happening).
      // Rather than chase a placement that only works at some viewport
      // sizes, just step aside entirely here — the user already knows what
      // to do, and the tooltip returns for step 3 once the bill lands.
      if (isWaitStep && waitStepPickerOpen) return null
      return (
        <div
          {...tooltipProps}
          className="w-70 rounded-lg bg-(--navy-light) p-4 shadow-(--shadow-md)"
        >
          <div className="flex items-start justify-between gap-2">
            {step.title ? (
              <p className="text-[14px] font-semibold text-(--navy)">{step.title}</p>
            ) : (
              <span />
            )}
            <button
              type="button"
              aria-label="Dismiss tour"
              onClick={finishTour}
              className="-mr-1 -mt-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-(--navy) opacity-70 transition hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-(--text-primary)">{step.content}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-(--text-secondary)">
              {index + 1} of {size}
            </span>
            {!isWaitStep && (
              <button
                type="button"
                onClick={() => (isLastStep ? finishTour() : setStepIndex(i => i + 1))}
                className="btn-navy inline-flex h-7 items-center px-3 text-[12px] font-semibold"
              >
                {isLastStep ? 'Done' : 'Next'}
              </button>
            )}
          </div>
        </div>
      )
    }
    return Tooltip
  }, [finishTour, waitStepPickerOpen])

  if (!card) return null

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      tooltipComponent={TourTooltip}
      onEvent={handleEvent}
      options={{ hideOverlay: true, skipBeacon: true, arrowColor: 'var(--navy-light)' }}
    />
  )
}
