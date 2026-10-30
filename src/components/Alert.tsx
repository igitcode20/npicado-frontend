import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'

type Tone = 'error' | 'success' | 'info' | 'warning'

interface AlertProps {
  tone?: Tone
  title?: string
  children: ReactNode
  onClose?: () => void
}

const icons = {
  error: <TriangleAlert size={18} />,
  success: <CheckCircle2 size={18} />,
  info: <Info size={18} />,
  warning: <TriangleAlert size={18} />,
}

export function Alert({ tone = 'info', title, children, onClose }: AlertProps) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="alert-icon">{icons[tone]}</span>
      <div className="alert-copy">
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Cerrar aviso">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
