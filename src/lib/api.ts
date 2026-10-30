const rawBase = (import.meta.env.VITE_API_URL ?? '').trim()
export const API_BASE = (rawBase || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'npicado_ia_token'

export class ApiError extends Error {
  status: number
  code: string
  payload: unknown

  constructor(message: string, status = 0, code = 'error', payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.payload = payload
  }
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sin almacenamiento, la sesión vive solo en memoria durante esta vista.
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada que limpiar.
  }
}

function extractError(status: number, payload: unknown): ApiError {
  let message = 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  let code = 'error'
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const detail = record.detail
    if (typeof detail === 'string') {
      message = detail
    } else if (detail && typeof detail === 'object') {
      const detailRecord = detail as Record<string, unknown>
      if (typeof detailRecord.message === 'string') message = detailRecord.message
      if (typeof detailRecord.code === 'string') code = detailRecord.code
    } else if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as Record<string, unknown>
      if (typeof first?.msg === 'string') message = first.msg
    } else if (typeof record.message === 'string') {
      message = record.message
    }
  }
  if (status === 0) code = 'network'
  if (status === 401) code = 'unauthorized'
  return new ApiError(message, status, code, payload)
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }
  return await response.text()
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options
  const headers = new Headers({ Accept: 'application/json' })
  const token = getToken()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      0,
      'network',
    )
  }

  const data = await parseResponse(response)
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearToken()
      window.dispatchEvent(new CustomEvent('npicado:unauthorized'))
    }
    throw extractError(response.status, data)
  }
  return data as T
}

export async function downloadGeneratedFile(
  id: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken()
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}/generated/${encodeURIComponent(id)}/download`, {
      headers,
    })
  } catch {
    throw new ApiError('No pudimos descargar el documento. Revisa tu conexión.', 0, 'network')
  }
  if (!response.ok) {
    const data = await parseResponse(response)
    throw extractError(response.status, data)
  }
  const disposition = response.headers.get('content-disposition') ?? ''
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i)
  let filename = 'documento'
  if (utf8Match?.[1]) {
    try {
      filename = decodeURIComponent(utf8Match[1])
    } catch {
      filename = utf8Match[1]
    }
  } else if (asciiMatch?.[1]) {
    filename = asciiMatch[1]
  }
  return { blob: await response.blob(), filename }
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}
