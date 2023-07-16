export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ErrorMessage {
  code: string
  message: string
}

export interface Attachment {
  title: string
  content: string
  type: 'image' | 'file' | 'text' | 'pdf'
  position?: 'before' | 'after'
  role?: 'system' | 'user' | 'assistant'
  progress?: number
}
