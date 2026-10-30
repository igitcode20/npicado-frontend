import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookMarked,
  Check,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  Files,
  LibraryBig,
  Sparkles,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Alert } from '../components/Alert'
import { EmptyState } from '../components/EmptyState'
import { InlineSpinner } from '../components/LoadingScreen'
import { PageHeader } from '../components/PageHeader'
import { useUsage } from '../context/UsageContext'
import {
  ApiError,
  apiRequest,
  downloadGeneratedFile,
  saveBlob,
} from '../lib/api'
import { formatBytes, formatDate, formatResetTime } from '../lib/format'
import type { GeneratedDocument, Usage } from '../types'

type Format = 'docx' | 'pdf' | 'xlsx' | 'txt'

interface FormatOption {
  id: Format
  label: string
  short: string
  description: string
  icon: LucideIcon
  accent: string
}

const formats: FormatOption[] = [
  {
    id: 'docx',
    label: 'Word',
    short: 'DOCX',
    description: 'Informes editables, con portada y estructura.',
    icon: FileText,
    accent: 'blue',
  },
  {
    id: 'pdf',
    label: 'PDF',
    short: 'PDF',
    description: 'Presentación final, lista para compartir.',
    icon: FileType2,
    accent: 'rose',
  },
  {
    id: 'xlsx',
    label: 'Excel',
    short: 'XLSX',
    description: 'Ideas y contenido organizados en hojas.',
    icon: FileSpreadsheet,
    accent: 'green',
  },
  {
    id: 'txt',
    label: 'Texto',
    short: 'TXT',
    description: 'Contenido plano, rápido de copiar y pegar.',
    icon: Files,
    accent: 'amber',
  },
]

const formatMeta = Object.fromEntries(formats.map((format) => [format.id, format])) as Record<
  Format,
  FormatOption
>

interface GenerateResponse {
  document: GeneratedDocument
  usage: Usage
  message: string
}

export function GeneratePage() {
  const { usage, setUsage } = useUsage()
  const [format, setFormat] = useState<Format>('docx')
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [sourceCount, setSourceCount] = useState(8)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDocument, setLastDocument] = useState<GeneratedDocument | null>(null)
  const [recent, setRecent] = useState<GeneratedDocument[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const quotaExhausted = Boolean(
    usage && !usage.documents.unlimited && usage.documents.remaining !== null && usage.documents.remaining <= 0,
  )
  const activeFormat = formatMeta[format]
  const ActiveFormatIcon = activeFormat.icon

  const loadRecent = async () => {
    try {
      const data = await apiRequest<{ items: GeneratedDocument[] }>('/generated?limit=10')
      setRecent(data.items)
    } catch {
      // La biblioteca de archivos no debe bloquear el generador.
    } finally {
      setLoadingRecent(false)
    }
  }

  useEffect(() => {
    void loadRecent()
  }, [])

  const downloadDocument = async (document: GeneratedDocument) => {
    setDownloadingId(document.id)
    setError(null)
    try {
      const { blob, filename } = await downloadGeneratedFile(document.id)
      saveBlob(blob, filename || document.filename)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos descargar el documento.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (generating) return
    if (topic.trim().length < 3) {
      setError('Escribe un tema de al menos 3 caracteres.')
      return
    }
    if (quotaExhausted) {
      setError(
        `Alcanzaste el límite de documentos de hoy.${
          usage ? ` Se renueva el ${formatResetTime(usage.reset_at)}.` : ''
        }`,
      )
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const data = await apiRequest<GenerateResponse>('/generate', {
        method: 'POST',
        body: {
          tema: topic.trim(),
          formato: format,
          instrucciones: instructions.trim(),
          fuentes: sourceCount,
        },
      })
      setUsage(data.usage)
      setLastDocument(data.document)
      setRecent((current) => [
        data.document,
        ...current.filter((item) => item.id !== data.document.id),
      ])
      await downloadDocument(data.document)
      void loadRecent()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.code === 'quota_documents') {
          try {
            const fresh = await apiRequest<Usage>('/usage')
            setUsage(fresh)
          } catch {
            // Conservamos el contador actual.
          }
        }
      } else {
        setError('No pudimos generar el documento. Inténtalo de nuevo.')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="page page-generate">
      <PageHeader
        eyebrow="Fábrica de documentos"
        title={
          <>
            De tu biblioteca a un <em>documento listo.</em>
          </>
        }
        description="Elige el tema y el formato. Python compila la información de tus documentos en un archivo profesional, sin gastar tokens de IA."
        actions={
          <div className="generate-header-actions">
            <span className="zero-token-pill">
              <Zap size={13} />
              0 tokens de IA
            </span>
            <Link to="/biblioteca" className="btn btn-ghost btn-compact">
              <LibraryBig size={15} />
              Biblioteca
            </Link>
          </div>
        }
      />

      <div className="generate-grid">
        <section className="card generate-form-card">
          <form onSubmit={(event) => void handleGenerate(event)} className="generate-form">
            <div className="form-step">
              <div className="form-step-head">
                <span className="step-number">01</span>
                <div>
                  <h2>Elige el formato</h2>
                  <p>El mismo contenido, con el acabado que necesitas.</p>
                </div>
              </div>
              <div className="format-grid" role="radiogroup" aria-label="Formato del documento">
                {formats.map((option) => {
                  const Icon = option.icon
                  const selected = format === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`format-option format-${option.accent} ${selected ? 'selected' : ''}`}
                      onClick={() => setFormat(option.id)}
                    >
                      <span className="format-icon">
                        <Icon size={21} strokeWidth={1.8} />
                      </span>
                      <span className="format-copy">
                        <strong>{option.label}</strong>
                        <span className="format-ext">.{option.short.toLowerCase()}</span>
                      </span>
                      <span className="format-check">{selected && <Check size={13} />}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-step">
              <div className="form-step-head">
                <span className="step-number">02</span>
                <div>
                  <h2>Define el documento</h2>
                  <p>Cuéntanos qué necesitas y qué debe incluir.</p>
                </div>
              </div>

              <label className="field">
                <span className="field-label">Tema del documento</span>
                <span className="input-shell">
                  <BookMarked size={17} className="input-icon" />
                  <input
                    type="text"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Ej. Proceso de inducción para nuevos colaboradores"
                    maxLength={180}
                    required
                  />
                </span>
                <span className="field-hint">
                  Usa palabras que aparezcan en tus documentos para encontrar mejores fuentes.
                </span>
              </label>

              <label className="field">
                <span className="field-label">
                  Instrucciones <span className="optional">opcional</span>
                </span>
                <textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Ej. Enfocarlo en los primeros 30 días, incluir responsables y políticas de seguridad."
                  maxLength={2000}
                  rows={4}
                  className="textarea"
                />
                <span className="field-hint">{instructions.length}/2000 caracteres</span>
              </label>
            </div>

            <div className="form-step">
              <div className="form-step-head">
                <span className="step-number">03</span>
                <div>
                  <h2>Profundidad documental</h2>
                  <p>Cuántos fragmentos de la biblioteca quieres aprovechar.</p>
                </div>
              </div>
              <div className="depth-row">
                {[4, 6, 8, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`depth-option ${sourceCount === count ? 'selected' : ''}`}
                    onClick={() => setSourceCount(count)}
                  >
                    <strong>{count}</strong>
                    <span>fragmentos</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <Alert tone="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {quotaExhausted && (
              <div className="quota-inline">
                <Clock3 size={15} />
                <span>
                  Límite diario alcanzado.
                  {usage && ` Se renueva el ${formatResetTime(usage.reset_at)}.`}
                </span>
              </div>
            )}

            <div className="generate-submit-row">
              <div className="generate-trust">
                <span>
                  <Check size={13} /> Python compila el archivo
                </span>
                <span>
                  <Check size={13} /> Groq no redacta aquí
                </span>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-generate"
                disabled={generating || quotaExhausted}
              >
                {generating ? (
                  <>
                    <span className="spinner spinner-light" />
                    Compilando fuentes…
                  </>
                ) : (
                  <>
                    <WandSparkles size={18} />
                    Generar {activeFormat.label}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <aside className="generate-aside">
          <div className="zero-token-card">
            <div className="zero-token-orb">
              <Zap size={19} />
            </div>
            <div>
              <p className="eyebrow">La diferencia NPICADO</p>
              <h2>Cero tokens para crear.</h2>
              <p>
                NPI solo se usa para conversar. Los documentos los construye Python con el texto
                real de tu biblioteca, así que puedes generar hasta 8 al día sin gastar tu API de
                Groq.
              </p>
            </div>
            <div className="zero-token-stats">
              <span>
                <strong>0</strong>
                tokens de Groq
              </span>
              <span>
                <strong>{usage?.documents.unlimited ? '∞' : (usage?.documents.remaining ?? 8)}</strong>
                disponibles hoy
              </span>
            </div>
          </div>

          <div className={`doc-preview-card preview-${format}`}>
            <div className="preview-toolbar">
              <span className="preview-label">Vista previa</span>
              <span className="preview-format">
                <ActiveFormatIcon size={13} />
                {activeFormat.short}
              </span>
            </div>
            <div className={`preview-paper preview-paper-${format}`}>
              <div className="preview-brand">
                <span className="preview-brand-mark">N</span>
                <span>NPICADO IA</span>
              </div>
              <div className="preview-title">
                {topic.trim() || 'El tema de tu próximo documento'}
              </div>
              <div className="preview-rule" />
              {format === 'xlsx' ? (
                <div className="preview-grid">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span key={index} className={index < 4 ? 'filled' : ''} />
                  ))}
                </div>
              ) : (
                <div className="preview-lines">
                  <span />
                  <span />
                  <span className="short" />
                  <span className="gap" />
                  <span />
                  <span className="medium" />
                  {format === 'txt' && <span className="short" />}
                </div>
              )}
              <div className="preview-foot">
                <span>Preparado por Python</span>
                <span>0 tokens</span>
              </div>
            </div>
            {lastDocument && (
              <div className="preview-download-note">
                <Check size={14} />
                <span>Tu último documento está listo</span>
              </div>
            )}
          </div>

          {lastDocument && (
            <div className="last-document card">
              <div className="last-document-head">
                <span className={`file-badge file-${lastDocument.formato}`}>
                  {(() => {
                    const Icon = formatMeta[lastDocument.formato].icon
                    return <Icon size={17} />
                  })()}
                </span>
                <div>
                  <strong>Documento generado</strong>
                  <span>{lastDocument.filename}</span>
                </div>
              </div>
              <div className="last-document-meta">
                <span>{formatBytes(lastDocument.size_bytes)}</span>
                <span>·</span>
                <span>{lastDocument.sources_count} fuentes</span>
                <span>·</span>
                <span>0 tokens</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => void downloadDocument(lastDocument)}
                disabled={downloadingId === lastDocument.id}
              >
                {downloadingId === lastDocument.id ? (
                  <InlineSpinner label="Descargando…" />
                ) : (
                  <>
                    <Download size={16} />
                    Descargar de nuevo
                  </>
                )}
              </button>
            </div>
          )}
        </aside>
      </div>

      <section className="recent-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Archivo temporal</p>
            <h2>Documentos recientes</h2>
          </div>
          <span className="section-note">
            <Clock3 size={13} /> Se conservan durante 7 días
          </span>
        </div>

        {loadingRecent ? (
          <div className="recent-loading">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Files size={23} />}
            title="Todavía no has generado documentos"
            description="Cuando crees el primero, aparecerá aquí durante 7 días para que puedas descargarlo otra vez."
            compact
          />
        ) : (
          <div className="recent-grid">
            {recent.map((document) => {
              const Icon = formatMeta[document.formato].icon
              return (
                <article className="recent-card" key={document.id}>
                  <span className={`file-badge file-${document.formato}`}>
                    <Icon size={19} />
                  </span>
                  <div className="recent-copy">
                    <strong>{document.tema}</strong>
                    <span>
                      {document.filename} · {formatBytes(document.size_bytes)}
                    </span>
                    <span className="recent-meta">
                      {formatDate(document.created_at, true)} · {document.sources_count} fuentes · 0
                      tokens
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => void downloadDocument(document)}
                    disabled={downloadingId === document.id}
                    aria-label={`Descargar ${document.tema}`}
                  >
                    {downloadingId === document.id ? (
                      <span className="spinner" />
                    ) : (
                      <Download size={17} />
                    )}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <div className="generate-footnote">
        <Sparkles size={15} />
        <span>
          Los documentos se construyen con fragmentos de tu biblioteca y conservan sus fuentes. No
          se usa IA generativa para redactarlos.
        </span>
      </div>
    </div>
  )
}
