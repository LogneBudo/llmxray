import type { Conversation, ChatMessage } from '@/types/conversation'
import type { OllamaOptions } from '@/types/ollama'
import type { Session } from '@/types/session'
import type { StreamToken } from '@/types/token'

const DB_NAME = 'llmxray-conversations'
const DB_VERSION = 1

const STORE_CONVERSATIONS = 'conversations'
const STORE_MESSAGES = 'messages'
const STORE_SESSIONS = 'sessions'
const STORE_TOKENS = 'tokens'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' })
        msgStore.createIndex('byConversation', 'conversationId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' })
        sessStore.createIndex('byConversation', 'conversationId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_TOKENS)) {
        const tokStore = db.createObjectStore(STORE_TOKENS, { keyPath: 'sessionId' })
        tokStore.createIndex('bySession', 'sessionId', { unique: true })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function getOne<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAllByIndex<T>(store: IDBObjectStore, indexName: string, key: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const index = store.index(indexName)
    const request = index.getAll(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Stored conversation metadata (messages stored separately for lazy loading) */
export interface StoredConversation {
  id: string
  name: string
  title: string
  model: string
  options: OllamaOptions
  createdAt: number
  updatedAt: number
}

/** Session stored with a conversationId link */
export interface StoredSession extends Session {
  conversationId: string
}

/** Token array stored per session */
export interface StoredTokens {
  sessionId: string
  tokens: StreamToken[]
}

export const conversationDB = {
  // ── Conversations ──────────────────────────────────────────────

  async saveConversation(conv: Conversation): Promise<void> {
    const db = await openDB()
    const tx = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite')

    // Store conversation metadata (without messages)
    const stored: StoredConversation = {
      id: conv.id,
      name: conv.name,
      title: conv.title,
      model: conv.model,
      options: conv.options,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }
    tx.objectStore(STORE_CONVERSATIONS).put(stored)

    // Store each message individually
    const msgStore = tx.objectStore(STORE_MESSAGES)
    for (const msg of conv.messages) {
      msgStore.put(msg)
    }

    await txPromise(tx)
    db.close()
  },

  async saveConversationMeta(conv: Conversation): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite')
    const stored: StoredConversation = {
      id: conv.id,
      name: conv.name,
      title: conv.title,
      model: conv.model,
      options: conv.options,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }
    tx.objectStore(STORE_CONVERSATIONS).put(stored)
    await txPromise(tx)
    db.close()
  },

  async saveMessage(message: ChatMessage): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_MESSAGES, 'readwrite')
    tx.objectStore(STORE_MESSAGES).put(message)
    await txPromise(tx)
    db.close()
  },

  async getAllConversations(): Promise<StoredConversation[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_CONVERSATIONS, 'readonly')
    const result = await getAll<StoredConversation>(tx.objectStore(STORE_CONVERSATIONS))
    db.close()
    return result
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_MESSAGES, 'readonly')
    const result = await getAllByIndex<ChatMessage>(
      tx.objectStore(STORE_MESSAGES),
      'byConversation',
      conversationId,
    )
    db.close()
    return result.sort((a, b) => a.timestamp - b.timestamp)
  },

  async deleteConversation(id: string): Promise<void> {
    const db = await openDB()

    // Get messages to find linked sessionIds
    const msgTx = db.transaction(STORE_MESSAGES, 'readonly')
    const messages = await getAllByIndex<ChatMessage>(
      msgTx.objectStore(STORE_MESSAGES),
      'byConversation',
      id,
    )
    const sessionIds = messages
      .map((m) => m.sessionId)
      .filter((s): s is string => !!s)
    const uniqueSessionIds = [...new Set(sessionIds)]

    // Delete everything in one transaction
    const stores = [STORE_CONVERSATIONS, STORE_MESSAGES, STORE_SESSIONS, STORE_TOKENS]
    const tx = db.transaction(stores, 'readwrite')

    tx.objectStore(STORE_CONVERSATIONS).delete(id)

    const msgStore = tx.objectStore(STORE_MESSAGES)
    for (const msg of messages) {
      msgStore.delete(msg.id)
    }

    const sessStore = tx.objectStore(STORE_SESSIONS)
    const tokStore = tx.objectStore(STORE_TOKENS)
    for (const sid of uniqueSessionIds) {
      sessStore.delete(sid)
      tokStore.delete(sid)
    }

    await txPromise(tx)
    db.close()
  },

  // ── Sessions ───────────────────────────────────────────────────

  async saveSession(session: Session, conversationId: string): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_SESSIONS, 'readwrite')
    const stored: StoredSession = { ...session, conversationId }
    tx.objectStore(STORE_SESSIONS).put(stored)
    await txPromise(tx)
    db.close()
  },

  async getSession(sessionId: string): Promise<StoredSession | undefined> {
    const db = await openDB()
    const tx = db.transaction(STORE_SESSIONS, 'readonly')
    const result = await getOne<StoredSession>(tx.objectStore(STORE_SESSIONS), sessionId)
    db.close()
    return result
  },

  async getSessionsByConversation(conversationId: string): Promise<StoredSession[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_SESSIONS, 'readonly')
    const result = await getAllByIndex<StoredSession>(
      tx.objectStore(STORE_SESSIONS),
      'byConversation',
      conversationId,
    )
    db.close()
    return result
  },

  // ── Tokens ─────────────────────────────────────────────────────

  async saveTokens(sessionId: string, tokens: StreamToken[]): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_TOKENS, 'readwrite')
    const stored: StoredTokens = { sessionId, tokens }
    tx.objectStore(STORE_TOKENS).put(stored)
    await txPromise(tx)
    db.close()
  },

  async getTokens(sessionId: string): Promise<StreamToken[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_TOKENS, 'readonly')
    const result = await getOne<StoredTokens>(tx.objectStore(STORE_TOKENS), sessionId)
    db.close()
    return result?.tokens ?? []
  },

  // ── Utilities ──────────────────────────────────────────────────

  async clear(): Promise<void> {
    const db = await openDB()
    const stores = [STORE_CONVERSATIONS, STORE_MESSAGES, STORE_SESSIONS, STORE_TOKENS]
    const tx = db.transaction(stores, 'readwrite')
    for (const name of stores) {
      tx.objectStore(name).clear()
    }
    await txPromise(tx)
    db.close()
  },
}
