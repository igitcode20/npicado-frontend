interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  showTagline?: boolean
}

export function Logo({ size = 'md', showText = true, showTagline = false }: LogoProps) {
  return (
    <div className={`brand brand-${size}`} aria-label="NPICADO IA">
      <div className="brand-mark" aria-hidden="true">
        <span className="brand-n">N</span>
        <span className="brand-dot" />
      </div>
      {showText && (
        <div className="brand-copy">
          <div className="brand-name">
            NPICADO <span>IA</span>
          </div>
          {showTagline && <div className="brand-tagline">Biblioteca inteligente</div>}
        </div>
      )}
    </div>
  )
}
