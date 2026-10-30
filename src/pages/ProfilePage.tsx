import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { Alert } from '../components/Alert'
import { InlineSpinner } from '../components/LoadingScreen'
import { PageHeader } from '../components/PageHeader'
import { UsageMeter } from '../components/UsageMeter'
import { useAuth } from '../context/AuthContext'
import { useUsage } from '../context/UsageContext'
import { ApiError, apiRequest, setToken } from '../lib/api'
import { formatDate, initials } from '../lib/format'
import {
  initializePwa,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from '../lib/pwa'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const { usage } = useUsage()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const [installAvailable, setInstallAvailable] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    initializePwa()
    return subscribeInstall(setInstallAvailable)
  }, [])

  if (!user) return null
  const isAdmin = user.role === 'admin'

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('La nueva contraseña debe ser diferente a la actual.')
      return
    }
    setChangingPassword(true)
    try {
      const data = await apiRequest<{ message: string; access_token: string }>(
        '/auth/change-password',
        {
          method: 'POST',
          body: { current_password: currentPassword, new_password: newPassword },
        },
      )
      if (data.access_token) setToken(data.access_token)
      setPasswordSuccess(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'No pudimos cambiar la contraseña.')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleInstall = async () => {
    setInstalling(true)
    const accepted = await promptInstall()
    if (accepted) setInstalled(true)
    setInstalling(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page page-profile">
      <PageHeader
        eyebrow="Mi cuenta"
        title={
          <>
            Tu espacio en <em>NPICADO IA.</em>
          </>
        }
        description="Gestiona tu acceso, revisa tus límites diarios y lleva la aplicación contigo."
      />

      <div className="profile-grid">
        <div className="profile-main">
          <section className="card profile-hero">
            <div className="profile-avatar-wrap">
              <span className="avatar profile-avatar">{initials(user.full_name)}</span>
              <span className="profile-status-dot" />
            </div>
            <div className="profile-identity">
              <div className="profile-name-row">
                <h2>{user.full_name}</h2>
                <span className={`role-badge role-${user.role}`}>
                  {isAdmin ? <ShieldCheck size={13} /> : <UsersRound size={13} />}
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </span>
              </div>
              <span className="profile-handle">@{user.username}</span>
              <div className="profile-meta">
                <span>
                  <CalendarDays size={14} /> Miembro desde {formatDate(user.created_at)}
                </span>
                <span>
                  <Check size={14} /> Cuenta {user.active ? 'activa' : 'inactiva'}
                </span>
              </div>
            </div>
            <div className="profile-hero-orb" aria-hidden="true">
              <Sparkles size={18} />
            </div>
          </section>

          <section className="card profile-usage">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Consumo</p>
                <h2>Tu uso de hoy</h2>
              </div>
              <span className="plan-badge">
                {isAdmin ? <Sparkles size={12} /> : null}
                {isAdmin ? 'Ilimitado' : 'Estándar'}
              </span>
            </div>
            <UsageMeter usage={usage} />
            <div className="profile-limit-cards">
              <div>
                <strong>{usage?.messages.limit === null ? '∞' : usage?.messages.limit ?? 50}</strong>
                <span>mensajes diarios</span>
                <small>Para conversar con NPI y tu biblioteca.</small>
              </div>
              <div>
                <strong>{usage?.documents.limit === null ? '∞' : usage?.documents.limit ?? 8}</strong>
                <span>documentos diarios</span>
                <small>Generados por Python, sin gastar tokens.</small>
              </div>
            </div>
            {isAdmin && (
              <p className="profile-admin-note">
                <ShieldCheck size={15} />
                Como administrador no tienes límites de mensajes ni de documentos.
              </p>
            )}
          </section>

          <section className="card password-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Seguridad</p>
                <h2>Cambia tu contraseña</h2>
              </div>
              <span className="card-heading-icon">
                <LockKeyhole size={20} />
              </span>
            </div>
            <p className="card-description">
              Usa una contraseña única que no compartas con nadie. Te recomendamos cambiarla si
              alguien más la conoce.
            </p>
            <form className="password-form" onSubmit={(event) => void handlePasswordChange(event)}>
              {passwordError && (
                <Alert tone="error" onClose={() => setPasswordError(null)}>
                  {passwordError}
                </Alert>
              )}
              {passwordSuccess && (
                <Alert tone="success" onClose={() => setPasswordSuccess(null)}>
                  {passwordSuccess}
                </Alert>
              )}
              <label className="field">
                <span className="field-label">Contraseña actual</span>
                <span className="input-shell">
                  <KeyRound size={16} className="input-icon" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </span>
              </label>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Nueva contraseña</span>
                  <span className="input-shell">
                    <LockKeyhole size={16} className="input-icon" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </span>
                </label>
                <label className="field">
                  <span className="field-label">Confirmar contraseña</span>
                  <span className="input-shell">
                    <LockKeyhole size={16} className="input-icon" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </span>
                </label>
              </div>
              <div className="password-form-footer">
                <span className="field-hint">Mínimo 8 caracteres.</span>
                <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                  {changingPassword ? (
                    <InlineSpinner label="Actualizando…" />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Actualizar contraseña
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="profile-side">
          <section className="card install-card">
            <div className="install-icon">
              <Smartphone size={22} />
            </div>
            <p className="eyebrow">Aplicación instalable</p>
            <h2>NPICADO IA en tu pantalla</h2>
            {installed ? (
              <>
                <p className="install-copy">
                  La aplicación ya está instalada en este dispositivo. Ábrela desde tu pantalla de
                  inicio para una experiencia sin navegador.
                </p>
                <span className="installed-badge">
                  <Check size={14} /> Instalada
                </span>
              </>
            ) : (
              <>
                <p className="install-copy">
                  Instálala como PWA para abrirla más rápido, con su propio icono y sin barras del
                  navegador.
                </p>
                {installAvailable ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={() => void handleInstall()}
                    disabled={installing}
                  >
                    {installing ? (
                      <InlineSpinner label="Instalando…" />
                    ) : (
                      <>
                        <Download size={16} />
                        Instalar aplicación
                      </>
                    )}
                  </button>
                ) : (
                  <div className="install-steps">
                    <span>
                      <strong>1</strong> Abre el menú de tu navegador.
                    </span>
                    <span>
                      <strong>2</strong> Elige «Instalar» o «Añadir a pantalla de inicio».
                    </span>
                    <span>
                      <strong>3</strong> Confirma y abre NPICADO IA como app.
                    </span>
                  </div>
                )}
              </>
            )}
          </section>

          {isAdmin && (
            <section className="card profile-admin-card">
              <div className="profile-admin-head">
                <ShieldCheck size={20} />
                <div>
                  <p className="eyebrow">Administración</p>
                  <h2>Gestiona el equipo</h2>
                </div>
              </div>
              <p>
                Crea las cuentas restantes, cambia roles o restablece contraseñas desde el panel de
                usuarios.
              </p>
              <Link to="/admin/usuarios" className="text-link">
                Ir a usuarios <ArrowRight size={14} />
              </Link>
            </section>
          )}

          <section className="card session-card">
            <p className="eyebrow">Sesión</p>
            <h2>Tu acceso actual</h2>
            <div className="session-details">
              <span>Usuario</span>
              <strong>@{user.username}</strong>
              <span>Rol</span>
              <strong>{isAdmin ? 'Administrador' : 'Usuario estándar'}</strong>
              <span>Último acceso</span>
              <strong>{formatDate(user.last_login_at, true)}</strong>
            </div>
            <button type="button" className="btn btn-ghost btn-full logout-button" onClick={handleLogout}>
              <LogOut size={16} />
              Cerrar sesión
            </button>
            <p className="security-note">
              <ShieldCheck size={13} />
              Plataforma privada · 5 accesos autorizados
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
