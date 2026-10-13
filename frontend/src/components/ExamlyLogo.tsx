type Props = {
  size?: 'small' | 'medium' | 'large'
  iconOnly?: boolean
}

export function ExamlyLogo({ size = 'medium', iconOnly = false }: Props) {
  return (
    <div
      className={`examly-logo examly-logo-${size}${iconOnly ? ' examly-logo-icon-only' : ''}`}
      role="img"
      aria-label="Examly AI — Smarter Questions. Better Assessments."
    >
      <img className="examly-logo-mark" src="/examly-icon.svg" alt="" />
      {!iconOnly && <span className="examly-logo-copy">
        <span className="examly-logo-name">Examly <span>AI</span></span>
        <span className="examly-logo-tagline">Smarter Questions. Better Assessments.</span>
      </span>}
    </div>
  )
}
