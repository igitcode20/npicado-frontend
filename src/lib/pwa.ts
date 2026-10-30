interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installEvent: BeforeInstallPromptEvent | null = null
let initialized = false
const listeners = new Set<(available: boolean) => void>()

function notify(): void {
  const available = installEvent !== null
  listeners.forEach((listener) => listener(available))
}

export function initializePwa(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installEvent = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    notify()
  })
}

export function canInstall(): boolean {
  return installEvent !== null
}

export function subscribeInstall(listener: (available: boolean) => void): () => void {
  listeners.add(listener)
  listener(canInstall())
  return () => listeners.delete(listener)
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export async function promptInstall(): Promise<boolean> {
  if (!installEvent) return false
  try {
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    installEvent = null
    notify()
    return choice.outcome === 'accepted'
  } catch {
    return false
  }
}
