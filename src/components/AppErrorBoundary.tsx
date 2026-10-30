import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Logo } from './Logo'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de interfaz en NPICADO IA', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="notfound-page">
          <Logo showTagline />
          <h1>Algo se interpuso en tu biblioteca.</h1>
          <p>Recarga la aplicación para volver a tu espacio de trabajo.</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
