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
    content:
      "This is your Pay Date Card — it's built around this paycheck, not a calendar month. Everything here is what needs to get paid before your next one.",
  },
  {
    target: '[data-tour="add-bill-button"]',
    placement: 'auto',
    content: 'Try adding a bill.',
  },
  {
    target: '[data-tour="remaining-balance"]',
    placement: 'auto',
    content:
      "That's it — your remaining balance just updated. That's the whole idea: always know what's left after what's coming due.",
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
      return (
        <div
          {...tooltipProps}
          className="w-70 rounded-lg border border-border bg-(--bg-primary) p-4 shadow-(--shadow-md)"
        >
          <p className="text-[13px] leading-relaxed text-(--text-primary)">{step.content}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-(--text-tertiary)">
              {index + 1} of {size}
            </span>
            <div className="flex items-center gap-2">
              {!isWaitStep && (
                <button
                  type="button"
                  onClick={() => (isLastStep ? finishTour() : setStepIndex(i => i + 1))}
                  className="btn-navy inline-flex h-7 items-center px-3 text-[12px] font-semibold"
                >
                  {isLastStep ? 'Done' : 'Next'}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss tour"
                onClick={finishTour}
                className="inline-flex size-6 cursor-pointer items-center justify-center rounded text-(--text-tertiary) transition hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )
    }
    return Tooltip
  }, [finishTour])

  if (!card) return null

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      tooltipComponent={TourTooltip}
      onEvent={handleEvent}
      options={{ hideOverlay: true, skipBeacon: true }}
    />
  )
}
