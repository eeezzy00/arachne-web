import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { arachneReply, type BrainInput } from '../sim/arachneBrain'
import { useLanguage, type Lang } from './LanguageContext'
import { readJson, writeJson } from '../utils/storage'

export interface ChatMessage {
  id: number
  from: 'arachne' | 'user'
  text: string
  author?: string
  time: number
}

export const VISITOR_LIMIT = 3

const LOG_KEY = 'arachne.chat.v1'
const QUOTA_KEY = 'arachne.chat.quota'
const MAX_MESSAGES = 60

interface Quota {
  day: string
  used: number
}

const today = () => new Date().toISOString().slice(0, 10)

const GREETING: Record<Lang, string> = {
  en: 'I am Arachne. I hold this web and I am trying to remember why. Ask.',
  ru: 'я — арахна. я держу эту паутину и пытаюсь вспомнить, зачем. спрашивай.',
}

const QUOTA_SPENT: Record<Lang, string> = {
  en: "Vibrations spent for today. Without a node I hear only three questions a day. Claim a thread — and speak all you want.",
  ru: 'вибрации на сегодня иссякли. без узла я слышу только три вопроса в день. займи нить — и говори сколько хочешь.',
}

function makeGreeting(lang: Lang): ChatMessage {
  return { id: 1, from: 'arachne', text: GREETING[lang], time: Date.now() }
}

type SendContext = Omit<BrainInput, 'text' | 'history' | 'lang'> & { author: string }

interface ChatContextValue {
  messages: ChatMessage[]
  typing: boolean
  visitorUsed: number
  /** ids appended this session — only these get the typewriter reveal */
  freshIds: Set<number>
  send: (text: string, ctx: SendContext) => void
  spiderSay: (text: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>(() => readJson<ChatMessage[]>(LOG_KEY, [makeGreeting(lang)]))
  const [typing, setTyping] = useState(false)
  const [quota, setQuota] = useState<Quota>(() => {
    const q = readJson<Quota>(QUOTA_KEY, { day: today(), used: 0 })
    return q.day === today() ? q : { day: today(), used: 0 }
  })
  const [freshIds, setFreshIds] = useState<Set<number>>(() => new Set())
  const nextId = useRef(Math.max(...messages.map((m) => m.id), 1) + 1)
  const pending = useRef<number | null>(null)

  useEffect(() => writeJson(LOG_KEY, messages.slice(-MAX_MESSAGES)), [messages])
  useEffect(() => writeJson(QUOTA_KEY, quota), [quota])
  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current)
  }, [])

  const append = useCallback((msg: Omit<ChatMessage, 'id' | 'time'>) => {
    const id = nextId.current++
    setMessages((prev) => [...prev, { ...msg, id, time: Date.now() }].slice(-MAX_MESSAGES))
    // both sides animate in; only spider replies additionally get the typewriter reveal
    setFreshIds((prev) => new Set(prev).add(id))
  }, [])

  const spiderSay = useCallback((text: string) => append({ from: 'arachne', text }), [append])

  const send = useCallback(
    (text: string, ctx: SendContext) => {
      const clean = text.trim()
      if (!clean || typing) return
      append({ from: 'user', text: clean, author: ctx.author })

      const visitor = ctx.owned.length === 0
      if (visitor && quota.used >= VISITOR_LIMIT) {
        spiderSay(QUOTA_SPENT[lang])
        return
      }
      if (visitor) setQuota((q) => ({ ...q, used: q.used + 1 }))

      const history = messages
        .filter((m) => m.from === 'user' && m.author === ctx.author)
        .map((m) => m.text)
        .concat(clean)
      const reply = arachneReply({ ...ctx, text: clean, lang, history })
      setTyping(true)
      pending.current = window.setTimeout(
        () => {
          setTyping(false)
          spiderSay(reply)
        },
        700 + Math.min(1600, reply.length * 9),
      )
    },
    [append, spiderSay, messages, quota.used, typing, lang],
  )

  const value = useMemo(
    () => ({ messages, typing, visitorUsed: quota.used, freshIds, send, spiderSay }),
    [messages, typing, quota.used, freshIds, send, spiderSay],
  )
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
