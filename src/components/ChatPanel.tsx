import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Lot } from '../data/lots'
import { ui } from '../i18n/ui'
import { computePattern } from '../sim/pattern'
import { useLanguage } from '../state/LanguageContext'
import { VISITOR_LIMIT, useChat, type ChatMessage } from '../state/ChatContext'
import { useWallet } from '../state/WalletContext'
import SpiderAvatar from './SpiderAvatar'
import Panel from './ui/Panel'

interface ChatPanelProps {
  lots: Lot[]
  tear: string | null
}

export default function ChatPanel({ lots, tear }: ChatPanelProps) {
  const { profile, openPicker } = useWallet()
  const { messages, typing, visitorUsed, freshIds, send } = useChat()
  const { lang } = useLanguage()
  const t = ui(lang)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const owned = useMemo(
    () => (profile ? lots.filter((l) => l.ownerAddress === profile.address) : []),
    [lots, profile],
  )
  const visitor = owned.length === 0
  const left = Math.max(0, VISITOR_LIMIT - visitorUsed)

  const scrollDown = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])
  useEffect(scrollDown, [scrollDown, messages.length, typing])

  const submit = (value: string) => {
    if (!value.trim() || typing) return
    send(value, {
      lots,
      owner: profile ? { nickname: profile.nickname } : null,
      owned,
      pattern: computePattern(lots),
      tear,
      author: profile?.nickname ?? t.chat.visitor,
    })
    setText('')
  }

  return (
    <Panel title={t.chat.title}>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 text-[12px] leading-relaxed">
        {messages.map((m) => (
          <Message key={m.id} message={m} animate={freshIds.has(m.id)} onGrow={scrollDown} />
        ))}
        {typing && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
            <SpiderAvatar size={16} />
            <span className="text-[var(--eye-glow)]">ARACHNE</span> {t.chat.typing}
            <span className="typing-dots" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {t.chat.suggestions.map((s) => (
          <button
            key={s}
            disabled={typing}
            onClick={() => submit(s)}
            className="border border-[var(--muted)]/40 px-2 py-1 text-[10px] text-[var(--muted)] transition hover:border-[var(--eye-glow)] hover:text-[var(--active)] disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder={visitor && left === 0 ? t.chat.placeholderLocked : t.chat.placeholder}
          className="min-w-0 flex-1 border-2 border-[var(--muted)]/40 bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--active)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--eye-glow)]"
        />
        <button
          type="submit"
          disabled={typing || !text.trim()}
          className="border-2 border-[var(--accent)] px-3 text-[9px] tracking-wider text-[var(--text)] transition hover:border-[var(--eye-glow)] disabled:opacity-40"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ▶
        </button>
      </form>

      <div className="mt-2 text-[10px] text-[var(--muted)]">
        {visitor ? (
          <>
            {t.chat.vibrations}: <span className={left === 0 ? 'text-[var(--eye-glow)]' : 'text-[var(--text)]'}>{left}/{VISITOR_LIMIT}</span>{' '}
            {t.chat.perDay}{' '}
            {profile ? (
              t.chat.claimToTalk
            ) : (
              <button onClick={openPicker} className="underline decoration-dotted hover:text-[var(--active)]">
                {t.chat.loginAndClaim}
              </button>
            )}
          </>
        ) : (
          <span className="text-[var(--text)]">{t.chat.unlimited(owned.length)}</span>
        )}
      </div>
    </Panel>
  )
}

function Message({ message, animate, onGrow }: { message: ChatMessage; animate: boolean; onGrow: () => void }) {
  const fromSpider = message.from === 'arachne'
  return (
    <div className={`flex flex-col ${fromSpider ? 'items-start' : 'items-end'} ${animate ? 'chat-msg-in' : ''}`}>
      <span className={`mb-0.5 flex items-center gap-1 text-[9px] tracking-widest ${fromSpider ? 'text-[var(--eye-glow)]' : 'text-[var(--muted)]'}`}>
        {fromSpider && <SpiderAvatar size={12} pulse={animate} />}
        {fromSpider ? 'ARACHNE' : message.author}
      </span>
      <p
        className={`max-w-[min(92%,640px)] border px-2.5 py-1.5 ${
          fromSpider
            ? `border-[var(--accent)]/60 bg-[var(--bg)]/70 text-[var(--text)] ${animate ? 'chat-bubble-spider' : ''}`
            : 'border-[var(--muted)]/30 bg-[var(--surface)] text-[var(--active)]'
        }`}
      >
        {animate && fromSpider ? <Typewriter text={message.text} onGrow={onGrow} /> : message.text}
      </p>
    </div>
  )
}

function Typewriter({ text, onGrow }: { text: string; onGrow: () => void }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (shown >= text.length) return
    const timer = setTimeout(() => {
      setShown((n) => Math.min(text.length, n + 2))
      onGrow()
    }, 22)
    return () => clearTimeout(timer)
  }, [shown, text, onGrow])
  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length && <span className="ml-0.5 inline-block h-3 w-1.5 bg-[var(--eye-glow)] align-middle" />}
    </>
  )
}
