import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Logo'

export function NotFoundPage() {
  const { user } = useAuth()
  return (
    <div className="notfound-page">
      <div className="notfound-glow" aria-hidden="true" />
      <Logo size="md" showTagline />
      <div className="notfound-code">404</div>
      <div className="notfound-icon">
        <Compass size={28} />
      </div>
      <h1>Esta página se perdió entre los documentos.</h1>
      <p>La dirección no existe o cambió de lugar. Vuelve a tu espacio de trabajo.</p>
      <Link to={user ? '/chat' : '/login'} className="btn btn-primary">
        <ArrowLeft size={16} />
        {user ? 'Volver al chat' : 'Ir al inicio de sesión'}
      </Link>
    </div>
  )
}
