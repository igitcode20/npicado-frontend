import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from '../lib/api'
import type { Usage } from '../types'
import { useAuth } from './AuthContext'

interface UsageContextValue {
  usage: Usage | null
  loading: boolean
  refreshUsage: () => Promise<void>
  setUsage: (usage: Usage) => void
}

const UsageContext = createContext<UsageContextValue | null>(null)

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [usage, setUsageState] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUsage = useCallback(async () => {
    if (!user) return
    try {
      const data = await apiRequest<Usage>('/usage')
      setUsageState(data)
    } catch {
      // El indicador de cuota no debe bloquear la navegación.
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    void refreshUsage()
  }, [refreshUsage])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshUsage()
    }
    window.addEventListener('focus', handleVisibility)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleVisibility)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refreshUsage])

  const setUsage = useCallback((value: Usage) => setUsageState(value), [])

  const value = useMemo(
    () => ({ usage, loading, refreshUsage, setUsage }),
    [usage, loading, refreshUsage, setUsage],
  )

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>
}

export function useUsage(): UsageContextValue {
  const context = useContext(UsageContext)
  if (!context) throw new Error('useUsage debe usarse dentro de UsageProvider')
  return context
}
