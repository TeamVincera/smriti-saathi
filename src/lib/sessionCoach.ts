/**
 * Small, on-device reflection for a completed game session.
 *
 * This intentionally does not score a person's cognition or make a health
 * judgement. It only chooses a gentle next step from signals the game already
 * records. A future secure API may implement SessionCoachEnhancer, but this
 * module never calls a network service itself.
 */

export type SessionCoachAction = 'celebrate' | 'gentler' | 'repeat' | 'rest'

export interface SessionCoachInput {
  completion?: number
  accuracy?: number
  attempts?: number
  durationMs?: number
  cueCount?: number
}

export interface SessionCoachResult {
  action: SessionCoachAction
  hasEnoughData: boolean
  source: 'local'
}

/**
 * Reserved seam for a later, centrally-approved enhancement service. The
 * current UI deliberately does not accept or invoke one, so the feature is
 * fully offline and deterministic.
 */
export type SessionCoachEnhancer = (
  input: Readonly<SessionCoachInput>,
  localResult: SessionCoachResult,
) => Promise<SessionCoachResult | null>

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function deriveSessionCoach(input: SessionCoachInput): SessionCoachResult {
  const { completion, accuracy, attempts } = input
  const hasEnoughData =
    finite(completion) &&
    finite(accuracy) &&
    finite(attempts) &&
    completion > 0 &&
    accuracy >= 0 &&
    accuracy <= 1 &&
    attempts > 0

  if (!hasEnoughData) {
    return { action: 'repeat', hasEnoughData: false, source: 'local' }
  }

  if (!finite(completion) || !finite(accuracy) || !finite(attempts)) {
    return { action: 'repeat', hasEnoughData: false, source: 'local' }
  }

  const completedWell = completion >= 0.9 && accuracy >= 0.75
  if (completedWell) {
    return { action: 'celebrate', hasEnoughData: true, source: 'local' }
  }

  if ((finite(input.durationMs) && input.durationMs >= 8 * 60 * 1000) || (finite(input.cueCount) && input.cueCount >= 5)) {
    return { action: 'rest', hasEnoughData: true, source: 'local' }
  }

  const neededMoreSupport =
    accuracy < 0.5 ||
    (finite(input.cueCount) && input.cueCount >= 3) ||
    (finite(input.durationMs) && input.durationMs >= 6 * 60 * 1000 && accuracy < 0.7)

  if (neededMoreSupport) {
    return { action: 'gentler', hasEnoughData: true, source: 'local' }
  }

  return { action: 'repeat', hasEnoughData: true, source: 'local' }
}
