import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUp,
  BookOpenText,
  ChevronDown,
  Clock3,
  FileText,
  History,
  LibraryBig,
  Menu,
  MessageSquarePlus,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Alert } from '../components/Alert'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Markdown } from '../components/Markdown'
import { useAuth } from '../context/AuthContext'
import { useUsage } from '../context/UsageContext'
import { ApiError, apiRequest } from '../lib/api'
import { formatResetTime, formatTime, greeting, initials } from '../lib/format'
import type {
  ChatMessage,
  ChatResponse,
  Conversation,
  ConversationMessages,
  Usage,
} from '../types'

const suggestions = [
  {
    icon: Sparkles,
    title: 'Puntos clave',
    text: 'Resume los puntos más importantes de mi biblioteca.',
  },
  {
    icon: LibraryBig,
    title: 'Explorar temas',
    text: '¿Qué documentos tengo y de qué tratan?',
  },
  {
    icon: FileText,
    title: 'Encontrar respuestas',
    text: '¿Qué información hay sobre procesos internos?',
  },
  {
    icon: Quote,
    title: 'Con fuentes',
    text: 'Explícame las políticas internas citando las fuentes.',
  },
]

function TypingIndicator() {
  return (
    <div className="message message-assistant">
      <div className="message-avatar assistant-avatar">N</div>
      <div className="message-body">
        <div className="message-meta">
          <strong>NPI</strong>
          <span>pensando</span>
        </div>
        <div className="message-bubble typing-bubble" aria-label="NPI está escribiendo">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="chat-skeleton">
      <div className="skeleton-message">
        <div className="skeleton-avatar" />
        <div className="skeleton-bubble">
          <span className="skeleton-line" />
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
        </div>
      </div>
      <div className="skeleton-message right">
        <div className="skeleton-bubble short" />
      </div>
    </div>
  )
}

export function ChatPage() {
  const { user } = useAuth()
  const { usage, setUsage } = useUsage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [mobileHistory, setMobileHistory] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [deleting, setDeleting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const skipNextLoadRef = useRef(false)

  const activeConversation = conversations.find((item) => item.id === activeId) ?? null
  const messagesExhausted = Boolean(
    usage && !usage.messages.unlimited && usage.messages.remaining !== null && usage.messages.remaining <= 0,
  )

  const scrollToBottom = useCallback((smooth = true) => {
    window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
    })
  }, [])

  const loadConversations = useCallback(async (autoSelect: boolean) => {
    try {
      const data = await apiRequest<{ items: Conversation[] }>('/chat/conversations')
      setConversations(data.items)
      setHistoryError(null)
      if (autoSelect) {
        setActiveId((current) => current ?? data.items[0]?.id ?? null)
      }
    } catch (err) {
      if (err instanceof ApiError) setHistoryError(err.message)
    } finally {
      setLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations(true)
  }, [loadConversations])

  useEffect(() => {
    if (!activeId) {
      return
    }
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    let cancelled = false
    setLoadingMessages(true)
    setError(null)
    apiRequest<ConversationMessages>(`/chat/conversations/${activeId}/messages`)
      .then((data) => {
        if (!cancelled) {
          setMessages(data.items)
          window.setTimeout(() => scrollToBottom(false), 40)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          if (err.status !== 401) setError(err.message)
        } else {
          setError('No pudimos cargar la conversación.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeId, scrollToBottom])

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, scrollToBottom])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`
  }, [draft])

  useEffect(() => {
    if (!mobileHistory) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setMobileHistory(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileHistory])

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !sending) {
        event.preventDefault()
        setActiveId(null)
        setMessages([])
        setError(null)
        setMobileHistory(false)
        window.setTimeout(() => textareaRef.current?.focus(), 60)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [sending])

  const startNewChat = () => {
    if (sending) return
    setActiveId(null)
    setMessages([])
    setError(null)
    setMobileHistory(false)
    window.setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const selectConversation = (id: string) => {
    if (sending) return
    setActiveId(id)
    setError(null)
    setMobileHistory(false)
  }

  const handleSuggestion = (text: string) => {
    setDraft(text)
    window.setTimeout(() => textareaRef.current?.focus(), 20)
  }

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || sending || messagesExhausted) return
    setError(null)
    setDraft('')
    setSending(true)
    setMobileHistory(false)

    const temporaryId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: temporaryId,
      role: 'user',
      content: text,
      sources: [],
      created_at: new Date().toISOString(),
      pending: true,
    }
    setMessages((current) => [...current, optimistic])

    try {
      const response = await apiRequest<ChatResponse>('/chat', {
        method: 'POST',
        body: {
          message: text,
          conversation_id: activeId ?? undefined,
        },
      })
      setUsage(response.usage)
      setMessages((current) => [
        ...current.filter((message) => message.id !== temporaryId),
        response.user_message,
        response.message,
      ])
      if (!activeId) {
        skipNextLoadRef.current = true
        setActiveId(response.conversation.id)
      }
      setConversations((current) => {
        const rest = current.filter((item) => item.id !== response.conversation.id)
        return [response.conversation, ...rest]
      })
      void loadConversations(false)
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== temporaryId))
      setDraft(text)
      if (err instanceof ApiError) {
        if (err.code === 'quota_messages') {
          setError(err.message)
          try {
            const freshUsage = await apiRequest<Usage>('/usage')
            setUsage(freshUsage)
          } catch {
            // Sin cambios en el contador.
          }
        } else {
          setError(err.message)
        }
      } else {
        setError('No pudimos enviar tu mensaje. Inténtalo de nuevo.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  const confirmDelete = async () => {
    if (!conversationToDelete) return
    setDeleting(true)
    try {
      await apiRequest<{ message: string }>(`/chat/conversations/${conversationToDelete.id}`, {
        method: 'DELETE',
      })
      setConversations((current) =>
        current.filter((item) => item.id !== conversationToDelete.id),
      )
      if (activeId === conversationToDelete.id) {
        setActiveId(null)
        setMessages([])
      }
      setConversationToDelete(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos eliminar la conversación.')
    } finally {
      setDeleting(false)
    }
  }

  const remainingLabel =
    usage && !usage.messages.unlimited && usage.messages.remaining !== null
      ? `${usage.messages.remaining} ${usage.messages.remaining === 1 ? 'mensaje' : 'mensajes'} disponibles`
      : null

  return (
    <div className="chat-page">
      {mobileHistory && (
        <button
          type="button"
          className="chat-history-backdrop"
          onClick={() => setMobileHistory(false)}
          aria-label="Cerrar historial"
        />
      )}

      <aside className={`chat-history ${mobileHistory ? 'mobile-open' : ''}`}>
        <div className="chat-history-head">
          <div>
            <p className="eyebrow">Conversaciones</p>
            <h2>Tu historial</h2>
          </div>
          <button
            type="button"
            className="icon-button mobile-history-close"
            onClick={() => setMobileHistory(false)}
            aria-label="Cerrar historial"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className="icon-button new-chat-icon"
            onClick={startNewChat}
            disabled={sending}
            aria-label="Nueva conversación"
          >
            <Plus size={18} />
          </button>
        </div>

        <button type="button" className="new-chat-button" onClick={startNewChat} disabled={sending}>
          <MessageSquarePlus size={17} />
          Nueva conversación
          <span>Ctrl K</span>
        </button>

        {historyError && (
          <div className="history-error">
            <span>{historyError}</span>
            <button type="button" onClick={() => void loadConversations(false)}>
              Reintentar
            </button>
          </div>
        )}

        <div className="conversation-list">
          {loadingConversations ? (
            <>
              <div className="skeleton-conversation" />
              <div className="skeleton-conversation" />
              <div className="skeleton-conversation" />
            </>
          ) : conversations.length === 0 ? (
            <div className="history-empty">
              <History size={20} />
              <p>Aún no hay conversaciones.</p>
              <span>Tu primera pregunta abrirá el historial.</span>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${activeId === conversation.id ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="conversation-main"
                  onClick={() => selectConversation(conversation.id)}
                  disabled={sending}
                >
                  <span className="conversation-title">{conversation.title}</span>
                  <span className="conversation-preview">
                    {conversation.last_message || 'Sin mensajes todavía'}
                  </span>
                  <span className="conversation-time">
                    <Clock3 size={11} />
                    {formatTime(conversation.updated_at)}
                  </span>
                </button>
                <button
                  type="button"
                  className="conversation-delete"
                  onClick={() => setConversationToDelete(conversation)}
                  aria-label={`Eliminar ${conversation.title}`}
                  disabled={sending}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="chat-history-foot">
          <div className="history-foot-icon">
            <BookOpenText size={15} />
          </div>
          <p>
            NPI responde con base en tu biblioteca y cita los documentos que consulta.
          </p>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              type="button"
              className="icon-button chat-menu-button"
              onClick={() => setMobileHistory(true)}
              aria-label="Abrir historial"
            >
              <Menu size={19} />
            </button>
            <div className="assistant-avatar header-avatar">N</div>
            <div className="chat-assistant-info">
              <strong>NPI</strong>
              <span>
                <span className="online-dot" /> Asistente documental
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            {remainingLabel && <span className="quota-chip">{remainingLabel}</span>}
            <button type="button" className="btn btn-compact btn-ghost" onClick={startNewChat} disabled={sending}>
              <Plus size={15} />
              Nuevo chat
            </button>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-thread">
            {loadingMessages ? (
              <MessageSkeleton />
            ) : messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="welcome-orbit" aria-hidden="true">
                  <span className="welcome-orbit-ring ring-one" />
                  <span className="welcome-orbit-ring ring-two" />
                  <div className="welcome-mark">N</div>
                  <span className="welcome-spark spark-a" />
                  <span className="welcome-spark spark-b" />
                </div>
                <p className="eyebrow">
                  <Sparkles size={12} /> {greeting()}, {user?.full_name.split(' ')[0]}
                </p>
                <h1>
                  Pregúntale a <em>tu biblioteca.</em>
                </h1>
                <p className="welcome-lead">
                  NPI lee los documentos que has cargado y te responde con las fuentes exactas.
                  También puedes convertir lo que encuentre en un documento nuevo.
                </p>
                <div className="suggestion-grid">
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon
                    return (
                      <button
                        type="button"
                        className="suggestion-card"
                        key={suggestion.title}
                        onClick={() => handleSuggestion(suggestion.text)}
                      >
                        <span className="suggestion-icon">
                          <Icon size={17} />
                        </span>
                        <strong>{suggestion.title}</strong>
                        <span>{suggestion.text}</span>
                        <ArrowUp size={14} className="suggestion-arrow" />
                      </button>
                    )
                  })}
                </div>
                <div className="welcome-note">
                  <BookOpenText size={15} />
                  <span>Las respuestas incluyen las fuentes de tu biblioteca siempre que sea posible.</span>
                  <Link to="/biblioteca">Ver biblioteca</Link>
                </div>
              </div>
            ) : (
              <div className="message-list" role="log" aria-live="polite" aria-label="Conversación">
                {activeConversation && messages.length > 2 && (
                  <div className="conversation-context-label">
                    <span>{activeConversation.title}</span>
                  </div>
                )}
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message message-${message.role} ${message.pending ? 'pending' : ''}`}
                  >
                    <div
                      className={`message-avatar ${message.role === 'assistant' ? 'assistant-avatar' : 'user-avatar'}`}
                    >
                      {message.role === 'assistant' ? 'N' : initials(user?.full_name ?? 'Tú')}
                    </div>
                    <div className="message-body">
                      <div className="message-meta">
                        <strong>{message.role === 'assistant' ? 'NPI' : 'Tú'}</strong>
                        <span>{message.pending ? 'enviando…' : formatTime(message.created_at)}</span>
                        {message.role === 'assistant' && <span className="ai-chip">IA</span>}
                      </div>
                      <div className="message-bubble">
                        {message.role === 'assistant' ? (
                          <Markdown>{message.content}</Markdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                      {message.role === 'assistant' && message.sources.length > 0 && (
                        <details className="source-drawer">
                          <summary>
                            <span className="source-summary-main">
                              <BookOpenText size={14} />
                              {message.sources.length}{' '}
                              {message.sources.length === 1 ? 'fuente consultada' : 'fuentes consultadas'}
                            </span>
                            <ChevronDown size={15} className="source-chevron" />
                          </summary>
                          <div className="source-list">
                            {message.sources.map((source, index) => (
                              <div className="source-item" key={`${source.document_id}-${source.chunk_index}-${index}`}>
                                <span className="source-number">{index + 1}</span>
                                <div>
                                  <strong>{source.title}</strong>
                                  <span className="source-file">
                                    {source.filename} · {Math.round(source.score * 100)}% de afinidad
                                  </span>
                                  <p>{source.excerpt}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                ))}
                {sending && <TypingIndicator />}
                <div ref={endRef} className="chat-end" />
              </div>
            )}
          </div>
        </div>

        <div className="composer-zone">
          {error && (
            <Alert tone="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {messagesExhausted && (
            <div className="quota-limit-note">
              <Clock3 size={15} />
              <span>
                Llegaste al límite de mensajes de hoy.
                {usage && ` Se renueva el ${formatResetTime(usage.reset_at)}.`} Mientras tanto, puedes
                generar documentos con Python sin gastar tokens.
              </span>
              <Link to="/generar">Generar documento</Link>
            </div>
          )}
          <form className="composer" onSubmit={(event) => void sendMessage(event)}>
            <div className="composer-top">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  messagesExhausted
                    ? 'Límite diario alcanzado. Vuelve mañana o usa Generar.'
                    : 'Pregunta algo sobre tus documentos…'
                }
                rows={1}
                maxLength={4000}
                disabled={messagesExhausted || sending}
                aria-label="Mensaje para NPI"
              />
            </div>
            <div className="composer-bottom">
              <div className="composer-tools">
                <Link to="/biblioteca" className="composer-tool" title="Ver biblioteca">
                  <LibraryBig size={16} />
                  <span>Biblioteca</span>
                </Link>
                <Link to="/generar" className="composer-tool" title="Generar documento">
                  <FileText size={16} />
                  <span>Crear documento</span>
                </Link>
              </div>
              <div className="composer-submit-group">
                {draft.length > 0 && <span className="char-count">{draft.length}/4000</span>}
                <button
                  type="submit"
                  className="send-button"
                  disabled={!draft.trim() || sending || messagesExhausted}
                  aria-label="Enviar mensaje"
                >
                  {sending ? <span className="spinner spinner-light" /> : <ArrowUp size={19} />}
                </button>
              </div>
            </div>
          </form>
          <p className="composer-hint">
            <kbd>Enter</kbd> para enviar · <kbd>Shift</kbd> + <kbd>Enter</kbd> para una nueva línea
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={conversationToDelete !== null}
        title="Eliminar conversación"
        message={
          <>
            Se eliminará <strong>{conversationToDelete?.title}</strong> y todos sus mensajes. Esta
            acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConversationToDelete(null)}
      />
    </div>
  )
}
