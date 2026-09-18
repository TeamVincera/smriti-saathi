type StepActionsProps = {
  backLabel: string
  nextLabel: string
  onBack: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextTestId?: string
  nextDisabledReason?: string
}

/** Consistent, thumb-friendly navigation for each onboarding step. */
export function StepActions({
  backLabel,
  nextLabel,
  onBack,
  onNext,
  nextDisabled = false,
  nextTestId = 'step-next-btn',
  nextDisabledReason,
}: StepActionsProps) {
  return (
    <div className="onboarding-actions">
      <button type="button" className="btn btn-secondary btn-block" onClick={onBack}>
        {backLabel}
      </button>
      <button
        type="button"
        className="btn btn-cta btn-block"
        data-testid={nextTestId}
        disabled={nextDisabled}
        aria-describedby={nextDisabled && nextDisabledReason ? `${nextTestId}-hint` : undefined}
        onClick={onNext}
      >
        {nextLabel}
      </button>
      {nextDisabled && nextDisabledReason && (
        <p id={`${nextTestId}-hint`} className="onboarding-validation" role="status" aria-live="polite">
          {nextDisabledReason}
        </p>
      )}
    </div>
  )
}
