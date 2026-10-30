import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  BookOpenText,
  Bot,
  Check,
  Copy,
  FileStack,
  KeyRound,
  MessageSquareText,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
import { InlineSpinner } from '../components/LoadingScreen'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { ApiError, apiRequest } from '../lib/api'
import { formatDate, formatNumber, initials } from '../lib/format'
import type { AdminStats, AdminUser, AdminUsersResponse, Role } from '../types'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  const body = Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join('')
  return `${body}Aa1!`
}

function MiniStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="mini-stat">
      <span className="mini-stat-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string
    password: string
  } | null>(null)
  const [resetCredentials, setResetCredentials] = useState<{
    username: string
    password: string
  } | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('user')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [usersData, statsData] = await Promise.all([
        apiRequest<AdminUsersResponse>('/admin/users'),
        apiRequest<AdminStats>('/admin/stats'),
      ])
      setData(usersData)
      setStats(statsData)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar los usuarios.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const openCreate = () => {
    const standardFull =
      (data?.items.filter((person) => person.role === 'user').length ?? 0) >=
      (data?.max_standard_users ?? 3)
    setCreateError(null)
    setUsername('')
    setFullName('')
    setPassword(generatePassword())
    setRole(standardFull ? 'admin' : 'user')
    setCreateOpen(true)
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (creating) return
    setCreateError(null)
    setCreating(true)
    try {
      await apiRequest<{ user: AdminUser; message: string }>('/admin/users', {
        method: 'POST',
        body: {
          username: username.trim(),
          full_name: fullName.trim(),
          password,
          role,
        },
      })
      setCreateOpen(false)
      setResetCredentials(null)
      setCreatedCredentials({ username: username.trim(), password })
      setSuccess(`La cuenta de ${fullName.trim()} está lista.`)
      await loadData()
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'No pudimos crear el usuario.')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (person: AdminUser) => {
    setBusyUserId(person.id)
    setError(null)
    try {
      await apiRequest<{ user: AdminUser; message: string }>(`/admin/users/${person.id}`, {
        method: 'PATCH',
        body: { active: !person.active },
      })
      setSuccess(
        person.active
          ? `La cuenta de ${person.full_name} fue desactivada.`
          : `La cuenta de ${person.full_name} está activa de nuevo.`,
      )
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos actualizar la cuenta.')
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRoleChange = async (person: AdminUser, newRole: Role) => {
    if (newRole === person.role) return
    setBusyUserId(person.id)
    setError(null)
    try {
      await apiRequest<{ user: AdminUser; message: string }>(`/admin/users/${person.id}`, {
        method: 'PATCH',
        body: { role: newRole },
      })
      setSuccess(
        newRole === 'admin'
          ? `${person.full_name} ahora es administrador.`
          : `${person.full_name} ahora es usuario estándar.`,
      )
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cambiar el rol.')
    } finally {
      setBusyUserId(null)
    }
  }

  const openReset = (person: AdminUser) => {
    setResetTarget(person)
    setNewPassword(generatePassword())
    setResetError(null)
    setCopied(false)
  }

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!resetTarget || resetting) return
    setResetError(null)
    setResetting(true)
    try {
      await apiRequest<{ user: AdminUser; message: string }>(`/admin/users/${resetTarget.id}`, {
        method: 'PATCH',
        body: { password: newPassword },
      })
      setSuccess(`La contraseña de ${resetTarget.full_name} fue actualizada.`)
      setCreatedCredentials(null)
      setResetCredentials({ username: resetTarget.username, password: newPassword })
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'No pudimos cambiar la contraseña.')
    } finally {
      setResetting(false)
    }
  }

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const slots = data?.slots_available ?? 0
  const admins = data?.items.filter((person) => person.role === 'admin').length ?? 0
  const standardUsers = data?.items.filter((person) => person.role === 'user').length ?? 0
  const standardLimit = data?.max_standard_users ?? 3
  const standardFull = standardUsers >= standardLimit
  const adminsFull = admins >= (data?.max_admins ?? 2)
  const activeUsers = data?.items.filter((person) => person.active).length ?? 0

  return (
    <div className="page page-admin">
      <PageHeader
        eyebrow="Administración"
        title={
          <>
            Las personas detrás de <em>tu biblioteca.</em>
          </>
        }
        description="Crea y gestiona las 5 cuentas de NPICADO IA. Los administradores tienen acceso ilimitado; los usuarios estándar, límites diarios."
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => void loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              Actualizar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-compact"
              onClick={openCreate}
              disabled={slots <= 0}
            >
              <UserPlus size={16} />
              Crear usuario
            </button>
          </>
        }
      />

      <div className="admin-summary-grid">
        <MiniStat
          icon={<UsersRound size={20} />}
          label="Cuentas"
          value={`${data?.total ?? 0} / ${data?.max_users ?? 5}`}
          detail={`${activeUsers} activas`}
        />
        <MiniStat
          icon={<ShieldCheck size={20} />}
          label="Administradores"
          value={`${admins} / ${data?.max_admins ?? 2}`}
          detail="acceso ilimitado"
        />
        <MiniStat
          icon={<MessageSquareText size={20} />}
          label="Mensajes hoy"
          value={formatNumber(stats?.today.messages ?? 0)}
          detail="en todas las cuentas"
        />
        <MiniStat
          icon={<FileStack size={20} />}
          label="Documentos hoy"
          value={formatNumber(stats?.today.documents_generated ?? 0)}
          detail="generados con Python"
        />
      </div>

      {stats && !stats.ai.groq_configured && (
        <Alert tone="warning" title="Groq aún no está configurado">
          El chat no podrá responder hasta que añadas <code>GROQ_API_KEY</code> en las variables de
          entorno del backend. La biblioteca y la generación de documentos sí funcionan.
        </Alert>
      )}

      {success && (
        <Alert tone="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {createdCredentials && (
        <Alert
          tone="info"
          title="Credenciales de la nueva cuenta"
          onClose={() => setCreatedCredentials(null)}
        >
          Comparte estos datos de forma privada:
          <div className="credential-inline">
            <code>{createdCredentials.username}</code>
            <span>/</span>
            <code>{createdCredentials.password}</code>
          </div>
        </Alert>
      )}
      {resetCredentials && (
        <Alert
          tone="info"
          title="Contraseña restablecida"
          onClose={() => setResetCredentials(null)}
        >
          Comparte la nueva contraseña de forma privada. Las sesiones anteriores de esta cuenta ya
          no funcionan.
          <div className="credential-inline">
            <code>{resetCredentials.username}</code>
            <span>/</span>
            <code>{resetCredentials.password}</code>
          </div>
        </Alert>
      )}
      {error && (
        <Alert tone="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="admin-layout">
        <section className="card users-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Equipo</p>
              <h2>Usuarios de la plataforma</h2>
            </div>
            <span className="account-slots">
              <UsersRound size={14} />
              {slots > 0 ? `${slots} plaza${slots === 1 ? '' : 's'} disponible${slots === 1 ? '' : 's'}` : 'Plan completo'}
            </span>
          </div>

          <div className="users-table-head">
            <span>Cuenta</span>
            <span>Rol</span>
            <span>Uso de hoy</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {loading ? (
            <div className="users-loading">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="user-skeleton" key={index}>
                  <span className="skeleton-avatar" />
                  <span className="skeleton-line medium" />
                  <span className="skeleton-line short" />
                </div>
              ))}
            </div>
          ) : data?.items.length ? (
            <div className="users-list">
              {data.items.map((person) => {
                const isSelf = person.id === currentUser?.id
                const busy = busyUserId === person.id
                return (
                  <div className={`user-row ${!person.active ? 'inactive' : ''}`} key={person.id}>
                    <div className="user-identity">
                      <span className="avatar avatar-md">{initials(person.full_name)}</span>
                      <div>
                        <strong>
                          {person.full_name}
                          {isSelf && <span className="you-badge">Tú</span>}
                        </strong>
                        <span>@{person.username}</span>
                      </div>
                    </div>

                    <div className="user-role-cell">
                      <select
                        value={person.role}
                        onChange={(event) => void handleRoleChange(person, event.target.value as Role)}
                        disabled={isSelf || busy || !person.active}
                        aria-label={`Rol de ${person.full_name}`}
                        className={`role-select role-${person.role}`}
                      >
                        <option value="admin">Administrador</option>
                        <option value="user">Usuario</option>
                      </select>
                      <span className="user-created">{formatDate(person.created_at)}</span>
                    </div>

                    <div className="user-usage-cell">
                      <span>
                        <MessageSquareText size={13} /> {person.usage_today.messages} mensajes
                      </span>
                      <span>
                        <FileStack size={13} /> {person.usage_today.documents} documentos
                      </span>
                      {person.role === 'admin' && (
                        <span className="unlimited-note">
                          <Sparkles size={12} /> Sin límite
                        </span>
                      )}
                    </div>

                    <div>
                      <span className={`status-pill ${person.active ? 'active' : 'inactive'}`}>
                        <span /> {person.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div className="user-actions">
                      {!isSelf ? (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => void handleToggleActive(person)}
                            disabled={busy}
                            aria-label={person.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                            title={person.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                          >
                            {busy ? (
                              <span className="spinner" />
                            ) : person.active ? (
                              <PowerOff size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => openReset(person)}
                            disabled={busy}
                            aria-label="Cambiar contraseña"
                            title="Cambiar contraseña"
                          >
                            <KeyRound size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="self-note">Tu cuenta</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<UserRound size={22} />}
              title="No hay usuarios"
              description="Crea la primera cuenta con el botón de arriba."
              compact
            />
          )}
        </section>

        <aside className="admin-side">
          <div className="card admin-limits-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Plan y límites</p>
                <h2>Lo que incluye</h2>
              </div>
              <ShieldCheck size={20} className="card-heading-icon" />
            </div>
            <ul className="limits-list">
              <li>
                <span>
                  <UsersRound size={15} /> Usuarios totales
                </span>
                <strong>{data?.max_users ?? 5}</strong>
              </li>
              <li>
                <span>
                  <ShieldCheck size={15} /> Administradores
                </span>
                <strong>{data?.max_admins ?? 2}</strong>
              </li>
              <li>
                <span>
                  <UsersRound size={15} /> Usuarios estándar
                </span>
                <strong>{standardUsers}/{standardLimit}</strong>
              </li>
              <li>
                <span>
                  <MessageSquareText size={15} /> Mensajes por usuario
                </span>
                <strong>{data?.daily_message_limit ?? 50}/día</strong>
              </li>
              <li>
                <span>
                  <FileStack size={15} /> Documentos por usuario
                </span>
                <strong>{data?.daily_document_limit ?? 8}/día</strong>
              </li>
              <li>
                <span>
                  <Sparkles size={15} /> Administradores
                </span>
                <strong>Ilimitado</strong>
              </li>
            </ul>
            <p className="limits-note">
              Los límites se renuevan cada medianoche en la zona horaria configurada.
            </p>
          </div>

          <div className="card ai-status-card">
            <div className="ai-status-head">
              <span className="ai-orb">
                <Bot size={19} />
              </span>
              <div>
                <span className="eyebrow">Motor conversacional</span>
                <h2>Groq</h2>
              </div>
              <span className={`status-pill ${stats?.ai.groq_configured ? 'active' : 'inactive'}`}>
                <span /> {stats?.ai.groq_configured ? 'Conectado' : 'Pendiente'}
              </span>
            </div>
            <p>
              {stats?.ai.groq_configured
                ? 'El chat está operativo. Los documentos se generan con Python y no consumen tokens.'
                : 'Añade GROQ_API_KEY en Render para activar las respuestas del chat. La generación de documentos no depende de Groq.'}
            </p>
            <div className="ai-model">
              <Bot size={14} />
              <span>{stats?.ai.model ?? 'openai/gpt-oss-120b'}</span>
            </div>
          </div>

          <div className="card admin-knowledge-card">
            <div className="admin-knowledge-head">
              <span>
                <BookOpenText size={18} />
              </span>
              <div>
                <p className="eyebrow">Conocimiento</p>
                <h2>{stats?.knowledge.documents ?? 0} documentos</h2>
              </div>
            </div>
            <div className="knowledge-stats">
              <span>
                <strong>{formatNumber(stats?.knowledge.chunks ?? 0)}</strong>
                fragmentos indexados
              </span>
              <span>
                <strong>{formatNumber(stats?.activity.messages ?? 0)}</strong>
                mensajes históricos
              </span>
            </div>
            <div className="admin-knowledge-footer">
              <Activity size={14} />
              <span>{stats?.activity.conversations ?? 0} conversaciones creadas</span>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="Crear una cuenta"
        eyebrow="Nuevo acceso"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="create-user-form"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? <InlineSpinner label="Creando…" /> : <><Plus size={16} /> Crear cuenta</>}
            </button>
          </>
        }
      >
        <form id="create-user-form" className="modal-form" onSubmit={(event) => void handleCreate(event)}>
          {createError && (
            <Alert tone="error" onClose={() => setCreateError(null)}>
              {createError}
            </Alert>
          )}
          <div className="field-row">
            <label className="field">
              <span className="field-label">Nombre completo</span>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ej. María López"
                maxLength={80}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field-label">Usuario</span>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ej. maria.lopez"
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9._-]{3,32}"
                title="Entre 3 y 32 caracteres: letras, números, punto, guion o guion bajo."
                autoCapitalize="none"
                required
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">Contraseña inicial</span>
            <div className="password-generate-row">
              <input
                type="text"
                className="input mono-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                onClick={() => setPassword(generatePassword())}
              >
                <RefreshCw size={14} />
                Sugerir
              </button>
            </div>
            <span className="field-hint">
              Mínimo 8 caracteres. Compártela con la persona y pídele que la cambie al entrar.
            </span>
          </label>

          <div className="field">
            <span className="field-label">Rol de la cuenta</span>
            <div className="role-choice-grid" role="radiogroup" aria-label="Rol de la cuenta">
              <button
                type="button"
                role="radio"
                aria-checked={role === 'user'}
                className={`role-choice ${role === 'user' ? 'selected' : ''}`}
                onClick={() => setRole('user')}
                disabled={standardFull}
              >
                <UserRound size={19} />
                <span>
                  <strong>Usuario estándar</strong>
                  <small>
                    {standardFull
                      ? 'Las 3 cuentas estándar están ocupadas'
                      : '50 mensajes y 8 documentos al día'}
                  </small>
                </span>
                <span className="role-choice-check">{role === 'user' && <Check size={13} />}</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === 'admin'}
                className={`role-choice ${role === 'admin' ? 'selected' : ''}`}
                onClick={() => setRole('admin')}
                disabled={adminsFull}
              >
                <ShieldCheck size={19} />
                <span>
                  <strong>Administrador</strong>
                  <small>
                    {adminsFull ? 'Las 2 cuentas admin están ocupadas' : 'Acceso completo, sin límites'}
                  </small>
                </span>
                <span className="role-choice-check">{role === 'admin' && <Check size={13} />}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetTarget !== null}
        onClose={() => (resetting ? undefined : setResetTarget(null))}
        title="Cambiar contraseña"
        eyebrow={resetTarget?.full_name ?? ''}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setResetTarget(null)}
              disabled={resetting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="reset-password-form"
              className="btn btn-primary"
              disabled={resetting}
            >
              {resetting ? <InlineSpinner label="Guardando…" /> : <><KeyRound size={15} /> Actualizar</>}
            </button>
          </>
        }
      >
        <form
          id="reset-password-form"
          className="modal-form"
          onSubmit={(event) => void handleResetPassword(event)}
        >
          {resetError && (
            <Alert tone="error" onClose={() => setResetError(null)}>
              {resetError}
            </Alert>
          )}
          <p className="modal-description">
            Define una contraseña temporal para <strong>{resetTarget?.full_name}</strong>. La
            anterior dejará de funcionar de inmediato.
          </p>
          <label className="field">
            <span className="field-label">Nueva contraseña</span>
            <div className="password-generate-row">
              <input
                type="text"
                className="input mono-input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
              <button type="button" className="btn btn-secondary btn-compact" onClick={copyPassword}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiada' : 'Copiar'}
              </button>
            </div>
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => setNewPassword(generatePassword())}
          >
            <RefreshCw size={13} />
            Generar otra contraseña segura
          </button>
        </form>
      </Modal>
    </div>
  )
}
