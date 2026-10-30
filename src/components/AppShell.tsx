import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpenText,
  ChevronRight,
  Download,
  FilePlus2,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  UsersRound,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useUsage } from '../context/UsageContext'
import { useOnline } from '../lib/useOnline'
import { initials } from '../lib/format'
import {
  initializePwa,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from '../lib/pwa'
import { Logo } from './Logo'
import { UsageMeter } from './UsageMeter'

interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: typeof MessageSquareText
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { to: '/chat', label: 'Chat documental', shortLabel: 'Chat', icon: MessageSquareText },
  { to: '/generar', label: 'Generar documento', shortLabel: 'Generar', icon: FilePlus2 },
  { to: '/biblioteca', label: 'Biblioteca', shortLabel: 'Biblioteca', icon: BookOpenText },
  { to: '/admin/usuarios', label: 'Usuarios', shortLabel: 'Usuarios', icon: UsersRound, adminOnly: true },
]

export function AppShell() {
  const { user } = useAuth()
  const { usage } = useUsage()
  const location = useLocation()
  const online = useOnline()
  const [installAvailable, setInstallAvailable] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    initializePwa()
    return subscribeInstall(setInstallAvailable)
  }, [])

  if (!user) return null
  const isChat = location.pathname.startsWith('/chat')
  const isAdmin = user.role === 'admin'
  const visibleNav = navigation.filter((item) => !item.adminOnly || isAdmin)
  const showInstall = installAvailable && !isStandalone()

  const handleInstall = async () => {
    setInstalling(true)
    await promptInstall()
    setInstalling(false)
  }

  const mobileNav = [
    ...visibleNav,
    { to: '/perfil', label: 'Mi cuenta', shortLabel: 'Perfil', icon: UserRound },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/chat" className="sidebar-brand" aria-label="Ir al chat">
          <Logo showTagline />
        </Link>

        <p className="sidebar-label">Espacio de trabajo</p>
        <nav className="side-nav" aria-label="Navegación principal">
          {visibleNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
              >
                <span className="side-icon">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span>{item.label}</span>
                {item.adminOnly && <span className="side-admin-tag">Admin</span>}
              </NavLink>
            )
          })}
        </nav>

        {isAdmin && (
          <div className="sidebar-admin-note">
            <ShieldCheck size={15} />
            <span>Modo administrador activo</span>
          </div>
        )}

        <div className="sidebar-spacer" />

        <UsageMeter usage={usage} compact />

        {showInstall && (
          <button
            type="button"
            className="install-link"
            onClick={() => void handleInstall()}
            disabled={installing}
          >
            <Download size={15} />
            {installing ? 'Instalando…' : 'Instalar aplicación'}
          </button>
        )}

        <Link to="/perfil" className="sidebar-user">
          <span className="avatar avatar-sm">{initials(user.full_name)}</span>
          <span className="sidebar-user-copy">
            <strong>{user.full_name}</strong>
            <small>{isAdmin ? 'Administrador' : 'Usuario'}</small>
          </span>
          <ChevronRight size={16} className="sidebar-user-arrow" />
        </Link>
      </aside>

      <div className="app-body">
        <header className="mobile-topbar">
          <Link to="/chat" aria-label="NPICADO IA">
            <Logo size="sm" />
          </Link>
          <div className="mobile-topbar-right">
            <span className={`status-dot ${online ? '' : 'offline'}`} />
            <Link to="/perfil" className="avatar avatar-sm" aria-label="Mi cuenta">
              {initials(user.full_name)}
            </Link>
          </div>
        </header>

        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={15} />
            Sin conexión. Puedes abrir la app, pero el chat y la biblioteca necesitan internet.
          </div>
        )}

        <main className={`app-main ${isChat ? 'chat-main' : ''}`}>
          <Outlet />
        </main>

        <nav className="mobile-nav" aria-label="Navegación móvil">
          {mobileNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{item.shortLabel}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
