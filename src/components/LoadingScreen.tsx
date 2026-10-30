import { Logo } from './Logo'

export function LoadingScreen({ label = 'Preparando tu biblioteca…' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-orbit">
        <div className="loading-orbit-ring" />
        <Logo size="lg" showText={false} />
      </div>
      <p>{label}</p>
      <div className="loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-spinner">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  )
}
