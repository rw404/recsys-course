import { ArrowRight, Check, Workflow, X } from 'lucide-react'
import type { ReactNode } from 'react'

export function LearningLabShell({
  dialogId,
  world,
  kicker,
  title,
  lead,
  badge,
  badgeNote,
  badgeIcon,
  onClose,
  children,
  footer,
  className = '',
}: {
  dialogId: string
  world: string
  kicker: string
  title: string
  lead: string
  badge: string
  badgeNote: string
  badgeIcon: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  className?: string
}) {
  return (
    <div className="overlay foundations-lab-overlay" onClick={onClose}>
      <main
        className={`foundations-lab learning-lab ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="foundations-lab-header learning-lab-header">
          <div>
            <span className="foundation-kicker">{world} · {kicker}</span>
            <h1 id={dialogId}>{title}</h1>
            <p>{lead}</p>
          </div>
          <div className="foundation-dataset-badge learning-lab-badge">
            {badgeIcon}
            <span><b>{badge}</b><small>{badgeNote}</small></span>
          </div>
          <button
            type="button"
            className="foundation-icon-button"
            onClick={onClose}
            aria-label="Close experiment"
            title="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className="foundation-lab-scroll learning-lab-scroll">
          {children}
        </div>

        <footer className="foundations-lab-actions learning-lab-actions">
          {footer}
        </footer>
      </main>
    </div>
  )
}

export function LearningLabFooter({
  ready,
  alreadyDone,
  pendingLabel,
  readyLabel,
  foundryLabel,
  checkpointLabel,
  onFoundry,
  onCheckpoint,
}: {
  ready: boolean
  alreadyDone: boolean
  pendingLabel: string
  readyLabel: string
  foundryLabel: string
  checkpointLabel: string
  onFoundry: () => void
  onCheckpoint: () => void
}) {
  return (
    <>
      <span>
        {ready
          ? <><Check size={16} aria-hidden />{readyLabel}</>
          : pendingLabel}
      </span>
      <button type="button" className="btn ghost" disabled={!ready} onClick={onFoundry}>
        <Workflow size={16} aria-hidden />{foundryLabel}
      </button>
      <button type="button" className="btn primary" disabled={!ready} onClick={onCheckpoint}>
        <span>{alreadyDone ? 'Review checkpoint' : checkpointLabel}</span>
        <ArrowRight size={16} aria-hidden />
      </button>
    </>
  )
}
