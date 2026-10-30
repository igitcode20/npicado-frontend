import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  BookOpenText,
  Database,
  FileSpreadsheet,
  FileText,
  FileType2,
  Files,
  FolderOpen,
  HardDrive,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { Alert } from '../components/Alert'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { InlineSpinner } from '../components/LoadingScreen'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { ApiError, apiRequest } from '../lib/api'
import {
  formatBytes,
  formatDate,
  formatNumber,
  readingTime,
} from '../lib/format'
import type {
  DocumentDetail,
  KnowledgeDocument,
  LibraryStats,
} from '../types'

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'txt', 'md', 'csv']
const MAX_FILE_BYTES = 15 * 1024 * 1024

const filters = [
  { value: '', label: 'Todos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'txt', label: 'Texto' },
]

function fileIcon(extension: string) {
  if (extension === 'pdf') return <FileType2 size={20} />
  if (extension === 'xlsx') return <FileSpreadsheet size={20} />
  if (extension === 'docx') return <FileText size={20} />
  return <Files size={20} />
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <span className="stat-hint">{hint}</span>
      </div>
    </div>
  )
}

export function LibraryPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<KnowledgeDocument | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (typeFilter) params.set('tipo', typeFilter)
      params.set('limit', '100')
      apiRequest<{ items: KnowledgeDocument[]; total: number }>(`/documents?${params.toString()}`)
        .then((data) => {
          if (cancelled) return
          setDocuments(data.items)
          setTotal(data.total)
          setError(null)
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof ApiError ? err.message : 'No pudimos cargar la biblioteca.')
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, search ? 280 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [search, typeFilter, reloadKey])

  useEffect(() => {
    let cancelled = false
    apiRequest<LibraryStats>('/documents/stats')
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = useCallback(() => {
    setReloadKey((value) => value + 1)
  }, [])

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return 'Formato no compatible. Sube PDF, DOCX, XLSX, TXT, MD o CSV.'
    }
    if (file.size > MAX_FILE_BYTES) {
      return 'El archivo supera el máximo de 15 MB.'
    }
    if (file.size === 0) {
      return 'El archivo está vacío.'
    }
    return null
  }

  const acceptFile = (file: File) => {
    const validation = validateFile(file)
    if (validation) {
      setUploadError(validation)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
    setUploadError(null)
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '))
    }
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) acceptFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!isAdmin) return
    const file = event.dataTransfer.files?.[0]
    if (file) acceptFile(file)
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setUploadTitle('')
    setUploadTags('')
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedFile || uploading) return
    setUploadError(null)
    setUploading(true)
    setSuccess(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', uploadTitle.trim())
    formData.append('tags', uploadTags.trim())
    try {
      const data = await apiRequest<{ document: KnowledgeDocument; message: string }>(
        '/documents',
        { method: 'POST', body: formData },
      )
      setSuccess(
        `«${data.document.title}» se añadió a la biblioteca y ya está disponible para NPI.`,
      )
      clearSelection()
      refresh()
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'No pudimos subir el documento.')
    } finally {
      setUploading(false)
    }
  }

  const openDetail = async (document: KnowledgeDocument) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const data = await apiRequest<DocumentDetail>(`/documents/${document.id}`)
      setDetail(data)
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'No pudimos abrir el documento.')
    } finally {
      setDetailLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!documentToDelete) return
    setDeleting(true)
    try {
      await apiRequest<{ message: string }>(`/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      })
      setSuccess(`«${documentToDelete.title}» se eliminó de la biblioteca.`)
      setDocumentToDelete(null)
      setDetailOpen(false)
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos eliminar el documento.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page page-library">
      <PageHeader
        eyebrow="Memoria de NPICADO"
        title={
          <>
            Tu biblioteca, <em>viva y organizada.</em>
          </>
        }
        description="Cada documento que subes se divide en fragmentos para que NPI encuentre la información exacta y pueda citar su origen."
        actions={
          <div className="library-header-actions">
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              Actualizar
            </button>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-compact"
                onClick={() => {
                  document.getElementById('subir-documento')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                  window.setTimeout(() => fileInputRef.current?.focus(), 500)
                }}
              >
                <Plus size={16} />
                Añadir documento
              </button>
            )}
          </div>
        }
      />

      <div className="stats-row">
        <StatCard
          icon={<FolderOpen size={20} />}
          label="Documentos"
          value={formatNumber(stats?.documents ?? 0)}
          hint="en la biblioteca"
        />
        <StatCard
          icon={<Layers size={20} />}
          label="Fragmentos"
          value={formatNumber(stats?.chunks ?? 0)}
          hint="listos para buscar"
        />
        <StatCard
          icon={<Database size={20} />}
          label="Caracteres"
          value={formatNumber(stats?.characters ?? 0)}
          hint="de conocimiento"
        />
        <StatCard
          icon={<HardDrive size={20} />}
          label="Formatos"
          value={formatNumber(Object.keys(stats?.by_type ?? {}).length)}
          hint="tipos de archivo"
        />
      </div>

      {isAdmin ? (
        <section className="upload-section" id="subir-documento">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Alimentar la biblioteca</p>
              <h2>Sube un documento nuevo</h2>
            </div>
            <span className="section-note">
              <ShieldCheck size={13} /> Solo administradores
            </span>
          </div>

          <form className="upload-card" onSubmit={(event) => void handleUpload(event)}>
            <div
              className={`dropzone ${dragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Seleccionar archivo para la biblioteca"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.txt,.md,.csv"
                onChange={handleFileInput}
                hidden
              />
              {selectedFile ? (
                <div className="selected-file">
                  <span className="upload-file-icon">
                    {fileIcon(selectedFile.name.split('.').pop()?.toLowerCase() ?? '')}
                  </span>
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <span>{formatBytes(selectedFile.size)} · listo para procesar</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button subtle"
                    onClick={(event) => {
                      event.stopPropagation()
                      clearSelection()
                    }}
                    aria-label="Quitar archivo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="dropzone-empty">
                  <span className="dropzone-icon">
                    <UploadCloud size={25} />
                  </span>
                  <strong>Arrastra un archivo o haz clic para elegirlo</strong>
                  <span>PDF, DOCX, XLSX, TXT, MD o CSV · máximo 15 MB</span>
                  <small>El texto se indexa; el archivo original no se almacena.</small>
                </div>
              )}
            </div>

            <div className="upload-fields">
              <label className="field">
                <span className="field-label">
                  Título <span className="optional">opcional</span>
                </span>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  placeholder="Ej. Manual de bienvenida 2026"
                  maxLength={160}
                  className="input"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Etiquetas <span className="optional">opcional</span>
                </span>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(event) => setUploadTags(event.target.value)}
                  placeholder="inducción, personal, procesos"
                  maxLength={240}
                  className="input"
                />
                <span className="field-hint">Sepáralas con comas. Ayudan a encontrar el documento.</span>
              </label>
              {uploadError && <Alert tone="error">{uploadError}</Alert>}
              <div className="upload-actions">
                <p>
                  Se extraerá el texto, se dividirá en fragmentos y se añadirá a la memoria de NPI.
                </p>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? (
                    <InlineSpinner label="Procesando…" />
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      Subir a la biblioteca
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      ) : (
        <div className="library-readonly-note">
          <ShieldCheck size={17} />
          <span>
            Tienes acceso de lectura a la biblioteca. Solo los administradores pueden añadir o
            eliminar documentos.
          </span>
        </div>
      )}

      {success && (
        <Alert tone="success" title="Biblioteca actualizada" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert tone="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <section className="library-section">
        <div className="library-toolbar">
          <div>
            <p className="eyebrow">Colección</p>
            <h2>
              Documentos <span className="count-badge">{total}</span>
            </h2>
          </div>
          <div className="library-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, archivo o etiqueta…"
                aria-label="Buscar documentos"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="filter-pills" role="group" aria-label="Filtrar por formato">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={typeFilter === filter.value ? 'active' : ''}
                  onClick={() => setTypeFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="document-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="document-skeleton" key={index}>
                <span className="skeleton-file" />
                <div>
                  <span className="skeleton-line medium" />
                  <span className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<BookOpenText size={23} />}
            title={search || typeFilter ? 'No encontramos documentos con ese filtro' : 'La biblioteca está esperando su primer documento'}
            description={
              search || typeFilter
                ? 'Prueba con otras palabras o cambia el formato.'
                : isAdmin
                  ? 'Sube un PDF, Word, Excel o texto y NPI empezará a responder con esa información.'
                  : 'Cuando el administrador suba documentos, aparecerán aquí.'
            }
            action={
              search || typeFilter ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearch('')
                    setTypeFilter('')
                  }}
                >
                  Limpiar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-row" key={document.id}>
                <button type="button" className="document-main" onClick={() => void openDetail(document)}>
                  <span className={`file-badge file-${document.extension}`}>
                    {fileIcon(document.extension)}
                  </span>
                  <div className="document-copy">
                    <div className="document-title-line">
                      <strong>{document.title}</strong>
                      <span className={`type-chip type-${document.extension}`}>
                        .{document.extension}
                      </span>
                    </div>
                    <p>{document.preview}</p>
                    <div className="document-meta">
                      <span>{document.filename}</span>
                      <span>·</span>
                      <span>{document.chunk_count} fragmentos</span>
                      <span>·</span>
                      <span>{formatBytes(document.size_bytes)}</span>
                      <span>·</span>
                      <span>{readingTime(document.char_count)}</span>
                    </div>
                    {document.tags.length > 0 && (
                      <div className="tag-row">
                        {document.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="document-side">
                    <span>{formatDate(document.uploaded_at)}</span>
                    <span className="document-uploader">por {document.uploaded_by}</span>
                  </div>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="document-delete"
                    onClick={() => setDocumentToDelete(document)}
                    aria-label={`Eliminar ${document.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.title ?? 'Detalle del documento'}
        eyebrow="Ficha documental"
        size="lg"
        footer={
          <>
            {isAdmin && detail && (
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => setDocumentToDelete(detail)}
              >
                <Trash2 size={15} />
                Eliminar documento
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setDetailOpen(false)}>
              Cerrar
            </button>
          </>
        }
      >
        {detailLoading ? (
          <div className="detail-loading">
            <InlineSpinner label="Abriendo documento…" />
          </div>
        ) : detailError ? (
          <Alert tone="error">{detailError}</Alert>
        ) : detail ? (
          <div className="document-detail">
            <div className="detail-summary">
              <span className={`file-badge file-${detail.extension}`}>
                {fileIcon(detail.extension)}
              </span>
              <div>
                <p>{detail.preview}</p>
                <span className="detail-file">{detail.filename}</span>
              </div>
            </div>
            <div className="detail-stats">
              <span>
                <strong>{detail.chunk_count}</strong> fragmentos
              </span>
              <span>
                <strong>{formatBytes(detail.size_bytes)}</strong> tamaño
              </span>
              <span>
                <strong>{formatNumber(detail.char_count)}</strong> caracteres
              </span>
              {detail.page_count && (
                <span>
                  <strong>{detail.page_count}</strong> páginas
                </span>
              )}
            </div>
            <div className="detail-meta-grid">
              <div>
                <span>Subido por</span>
                <strong>{detail.uploaded_by}</strong>
              </div>
              <div>
                <span>Fecha</span>
                <strong>{formatDate(detail.uploaded_at, true)}</strong>
              </div>
              <div>
                <span>Etiquetas</span>
                <strong>{detail.tags.length ? detail.tags.join(', ') : 'Sin etiquetas'}</strong>
              </div>
            </div>
            <div className="detail-fragments">
              <h3>Cómo lo lee NPI</h3>
              <p>Estos son los primeros fragmentos indexados de este documento.</p>
              {detail.fragments.map((fragment) => (
                <div className="fragment" key={fragment.chunk_index}>
                  <span>Fragmento {fragment.index}</span>
                  <p>{fragment.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={documentToDelete !== null}
        title="Eliminar documento"
        message={
          <>
            <strong>{documentToDelete?.title}</strong> dejará de formar parte de la memoria de NPI.
            Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar de la biblioteca"
        busy={deleting}
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
