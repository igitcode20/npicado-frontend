import { FileStack, MessagesSquare, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Usage } from '../types'
import { formatResetTime } from '../lib/format'

interface UsageMeterProps {
  usage: Usage | null
  compact?: boolean
}

function Meter({
  label,
  icon,
  used,
  limit,
  unlimited,
}: {
  label: string
  icon: ReactNode
  used: number
  limit: number | null
  unlimited: boolean
}) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100
  const state = unlimited ? 'unlimited' : percent >= 100 ? 'full' : percent >= 75 ? 'high' : 'normal'
  return (
    <div className={`meter-row meter-${state}`}>
      <div className="meter-label">
        <span className="meter-icon">{icon}</span>
        <span>{label}</span>
        <span className="meter-value">
          {unlimited ? (
            <>
              {used} <span className="meter-infinity">∞</span>
            </>
          ) : (
            <>
              {used}<span className="meter-total">/{limit}</span>
            </>
          )}
        </span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <span style={{ width: unlimited ? '100%' : `${percent}%` }} />
      </div>
    </div>
  )
}

export function UsageMeter({ usage, compact = false }: UsageMeterProps) {
  if (!usage) {
    return (
      <div className={`usage-card ${compact ? 'usage-compact' : ''} usage-loading`}>
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    )
  }

  return (
    <div className={`usage-card ${compact ? 'usage-compact' : ''}`}>
      <div className="usage-head">
        <div>
          <span className="usage-kicker">Tu uso de hoy</span>
          <strong>{usage.unlimited ? 'Acceso ilimitado' : 'Plan documental'}</strong>
        </div>
        <span className={`plan-badge ${usage.unlimited ? 'plan-admin' : ''}`}>
          {usage.unlimited ? <Sparkles size={12} /> : null}
          {usage.unlimited ? 'Admin' : 'Estándar'}
        </span>
      </div>
      <div className="meter-list">
        <Meter
          label="Mensajes"
          icon={<MessagesSquare size={14} />}
          used={usage.messages.used}
          limit={usage.messages.limit}
          unlimited={usage.messages.unlimited}
        />
        <Meter
          label="Documentos"
          icon={<FileStack size={14} />}
          used={usage.documents.used}
          limit={usage.documents.limit}
          unlimited={usage.documents.unlimited}
        />
      </div>
      {!compact && (
        <p className="usage-reset">
          {usage.unlimited
            ? 'Los administradores no tienen límite diario.'
            : `Se renueva el ${formatResetTime(usage.reset_at)}.`}
        </p>
      )}
    </div>
  )
}
