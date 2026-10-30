import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileStack,
  Fingerprint,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { Alert } from '../components/Alert'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      const state = location.state as { from?: string } | null
      const destination =
        state?.from && state.from.startsWith('/') && !state.from.startsWith('/login')
          ? state.from
          : '/chat'
      navigate(destination, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('No pudimos iniciar sesión. Inténtalo de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-grid" aria-hidden="true" />
      <div className="login-glow login-glow-a" aria-hidden="true" />
      <div className="login-glow login-glow-b" aria-hidden="true" />

      <section className="login-hero">
        <div className="login-hero-top">
          <Logo size="lg" showTagline />
        </div>

        <div className="login-hero-content">
          <div className="login-pill">
            <Sparkles size={13} />
            Inteligencia sobre tu propio conocimiento
          </div>
          <h1>
            Tu biblioteca,
            <br />
            <em>conversando contigo.</em>
          </h1>
          <p className="login-subtitle">
            Pregunta, comprende y crea. NPICADO IA conecta tus documentos con un asistente que
            responde con fuentes y convierte lo que sabes en documentos listos para usar.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon">
                <MessageSquareText size={18} />
              </span>
              <div>
                <strong>Chat con memoria</strong>
                <span>Respuestas ancladas a tu biblioteca.</span>
              </div>
            </div>
            <div className="login-feature">
              <span className="login-feature-icon">
                <FileStack size={18} />
              </span>
              <div>
                <strong>Documentos sin tokens</strong>
                <span>Python arma Word, PDF, Excel y TXT.</span>
              </div>
            </div>
          </div>

          <div className="login-doc-stack" aria-hidden="true">
            <div className="login-doc login-doc-back">
              <span>INFORME</span>
              <i />
              <i />
              <i className="short" />
            </div>
            <div className="login-doc login-doc-mid">
              <span>POLÍTICAS</span>
              <i />
              <i className="short" />
            </div>
            <div className="login-doc login-doc-front">
              <div className="login-doc-top">
                <span className="login-doc-brand">NPICADO IA</span>
                <span className="login-doc-live">
                  <span /> 0 tokens
                </span>
              </div>
              <strong>Tu conocimiento,<br />hecho documento.</strong>
              <div className="login-doc-lines">
                <i />
                <i />
                <i className="short" />
              </div>
              <div className="login-doc-footer">
                <FileStack size={13} />
                <span>Word · PDF · Excel · TXT</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="login-hero-footer">
          <span>Privado por diseño</span>
          <span className="login-footer-dot" />
          <span>5 accesos</span>
          <span className="login-footer-dot" />
          <span>PWA instalable</span>
        </footer>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-mobile-brand">
            <Logo showTagline />
          </div>

          <div className="login-heading">
            <p className="eyebrow">
              <span className="eyebrow-dot" /> Acceso privado
            </p>
            <h2>Bienvenido de nuevo</h2>
            <p>Entra con las credenciales que te asignó el administrador.</p>
          </div>

          {error && (
            <Alert tone="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} className="auth-form">
            <label className="field">
              <span className="field-label">Usuario</span>
              <span className="input-shell">
                <UserRound size={17} className="input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Tu nombre de usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  autoFocus
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Contraseña</span>
              <span className="input-shell">
                <LockKeyhole size={17} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner spinner-light" />
                  Comprobando acceso…
                </>
              ) : (
                <>
                  Entrar a mi biblioteca
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="login-security">
            <ShieldCheck size={16} />
            <span>Solo 5 cuentas autorizadas. Sin registro público.</span>
          </div>
        </div>

        <div className="login-help">
          <Fingerprint size={16} />
          <span>
            ¿Aún no tienes acceso? Pídele a <strong>Ismael</strong> que cree tu cuenta desde el
            panel de administración.
          </span>
        </div>

        <p className="login-version">NPICADO IA · v1.0 · Hecho para tu conocimiento</p>
      </section>
    </div>
  )
}
