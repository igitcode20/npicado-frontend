export type Role = 'admin' | 'user'

export interface User {
  id: string
  username: string
  full_name: string
  role: Role
  active: boolean
  created_at: string | null
  last_login_at: string | null
}

export interface UsageBucket {
  used: number
  limit: number | null
  remaining: number | null
  unlimited: boolean
}

export interface Usage {
  date: string
  timezone: string
  reset_at: string
  unlimited: boolean
  messages: UsageBucket
  documents: UsageBucket
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface MeResponse {
  user: User
  usage: Usage
}

export interface Source {
  document_id: string
  title: string
  filename: string
  chunk_index: number
  score: number
  excerpt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string | null
  pending?: boolean
}

export interface Conversation {
  id: string
  title: string
  last_message: string
  message_count: number
  created_at: string | null
  updated_at: string | null
}

export interface ChatResponse {
  conversation: Conversation
  user_message: ChatMessage
  message: ChatMessage
  sources: Source[]
  usage: Usage
}

export interface ConversationMessages {
  conversation: Conversation
  items: ChatMessage[]
}

export interface KnowledgeDocument {
  id: string
  title: string
  filename: string
  extension: string
  mime_type: string
  size_bytes: number
  char_count: number
  chunk_count: number
  page_count: number | null
  tags: string[]
  preview: string
  uploaded_by: string
  uploaded_at: string | null
}

export interface DocumentFragment {
  chunk_index: number
  index: number
  content: string
}

export interface DocumentDetail extends KnowledgeDocument {
  fragments: DocumentFragment[]
  created_at?: string | null
}

export interface LibraryStats {
  documents: number
  chunks: number
  characters: number
  by_type: Record<string, number>
}

export interface GeneratedDocument {
  id: string
  tema: string
  title: string
  formato: 'docx' | 'pdf' | 'xlsx' | 'txt'
  formato_label: string
  filename: string
  size_bytes: number
  ai_tokens_used: number
  sources_count: number
  sources: Source[]
  created_at: string | null
  expires_at: string | null
  download_url: string
}

export interface AdminUser extends User {
  usage_today: {
    messages: number
    documents: number
  }
}

export interface AdminUsersResponse {
  items: AdminUser[]
  total: number
  max_users: number
  max_admins: number
  max_standard_users: number
  slots_available: number
  daily_message_limit: number
  daily_document_limit: number
}

export interface AdminStats {
  users: {
    total: number
    active: number
    admins: number
    max: number
  }
  knowledge: {
    documents: number
    chunks: number
  }
  today: {
    messages: number
    documents_generated: number
    date: string
  }
  activity: {
    conversations: number
    messages: number
  }
  ai: {
    groq_configured: boolean
    model: string
  }
  limits: {
    daily_message_limit: number
    daily_document_limit: number
    max_users: number
    max_admins: number
  }
}

export interface AppMeta {
  app: string
  version: string
  max_users: number
  max_admins: number
  daily_message_limit: number
  daily_document_limit: number
  groq_configured: boolean
  timezone: string
}
