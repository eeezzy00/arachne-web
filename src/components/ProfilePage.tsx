import { useState, type ReactNode } from 'react'
import { rolePerk } from '../data/lore'
import { formatLotId, type Lot, type LotStatus } from '../data/lots'
import { getStackLayer } from '../data/roles'
import { ui } from '../i18n/ui'
import { lines, translateApiError } from '../i18n/lines'
import { ownerEdges } from '../sim/pattern'
import { useArchive } from '../state/ArchiveContext'
import { useLanguage, type Lang } from '../state/LanguageContext'
import type { LotsStore } from '../state/useLotsStore'
import { useWallet } from '../state/WalletContext'
import { shortenAddress } from '../utils/fakeWallet'
import { isValidAddress } from '../wallet/connectors'
import SpiderAvatar from './SpiderAvatar'
import { WalletIcon } from './WalletModal'
import Button from './ui/Button'
import Panel from './ui/Panel'

type ActionKind = 'rename' | 'whisper' | 'transfer' | 'sell'

const RANKS: Array<{ min: number; title: { en: string; ru: string } }> = [
  { min: 0, title: { en: 'UNBOUND', ru: 'НЕСВЯЗАННЫЙ' } },
  { min: 1, title: { en: 'THREADKEEPER', ru: 'ДЕРЖАТЕЛЬ НИТИ' } },
  { min: 3, title: { en: 'WEB-WARDEN', ru: 'СТРАЖ ПАУТИНЫ' } },
  { min: 6, title: { en: 'SECOND VOICE', ru: 'ВТОРОЙ ГОЛОС' } },
  { min: 10, title: { en: 'WEAVER OF THE PATTERN', ru: 'ТКАЧ УЗОРА' } },
]

function rankFor(count: number, lang: Lang): string {
  return [...RANKS].reverse().find((r) => count >= r.min)!.title[lang]
}

interface ProfilePageProps {
  store: LotsStore
  onShowOnWeb: (lot: Lot) => void
  onGoToWeb: () => void
}

export default function ProfilePage({ store, onShowOnWeb, onGoToWeb }: ProfilePageProps) {
  const { profile, openPicker } = useWallet()
  const { lang } = useLanguage()
  const t = ui(lang)

  if (!profile) {
    return (
      <Panel title={t.profile.title}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <SpiderAvatar size={64} />
          <p className="max-w-xs text-xs leading-relaxed text-[var(--muted)]">{t.profile.intro}</p>
          <Button onClick={openPicker}>{t.profile.enterWeb}</Button>
        </div>
      </Panel>
    )
  }

  const owned = store.lots.filter((l) => l.ownerAddress === profile.address)
  const threads = ownerEdges(store.lots, profile.address).length

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
      <WalletCard owned={owned} threads={threads} />
      <Panel title={`${t.profile.myNodes} · ${owned.length}`} scroll>
        {owned.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-xs text-[var(--muted)]">{t.profile.noNodes}</p>
            <Button onClick={onGoToWeb}>{t.profile.toWeb}</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {owned.map((lot) => (
              <OwnedLotCard key={lot.id} lot={lot} store={store} onShowOnWeb={onShowOnWeb} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function WalletCard({ owned, threads }: { owned: Lot[]; threads: number }) {
  const { profile, disconnect, setNickname, options } = useWallet()
  const { log } = useArchive()
  const { lang } = useLanguage()
  const t = ui(lang)
  const [editing, setEditing] = useState(false)
  const [nick, setNick] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  if (!profile) return null

  const walletOption = options.find((o) => o.id === profile.walletId)
  const value = owned.reduce((s, l) => s + l.priceUsd, 0)
  const whispers = owned.filter((l) => l.status === 'whisper').length
  const layerCount = new Set(owned.map((l) => getStackLayer(l.ring).id)).size
  const roleCount = new Set(owned.map((l) => rolePerk(l).archetype)).size
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — the address is selectable anyway
    }
  }

  const saveNick = () => {
    const next = nick.trim().toUpperCase()
    if (next && next !== profile.nickname) {
      log(lines.nicknameChanged(lang, profile.nickname, next))
      setNickname(next)
    }
    setEditing(false)
  }

  return (
    <Panel title={t.profile.wallet}>
      <div className="flex flex-col gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <SpiderAvatar size={44} pulse />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center border border-[var(--bg)] bg-[var(--surface)]">
              <WalletIcon
                option={{
                  icon: profile.walletIcon,
                  badge: walletOption?.badge ?? profile.walletName.charAt(0),
                  color: walletOption?.color ?? '#888',
                }}
                size={16}
              />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[var(--active)]">{profile.walletName}</div>
            <div className="text-[9px] tracking-wider text-[var(--muted)]">
              {profile.chain === 'solana' ? 'SOLANA' : 'EVM'}
              {profile.demo && <span className="ml-2 text-[var(--eye-glow)]">{t.header.demo}</span>}
            </div>
          </div>
        </div>

        <div className="border border-[var(--eye)]/40 bg-[var(--bg)]/50 px-2.5 py-1.5 text-center">
          <span className="text-[9px] tracking-widest text-[var(--muted)]">{t.profile.rank}: </span>
          <span className="text-[10px] tracking-wider text-[var(--eye-glow)]">{rankFor(owned.length, lang)}</span>
        </div>

        <div>
          <Label>{t.profile.address}</Label>
          <div className="flex items-start gap-2">
            <span className="flex-1 break-all text-[11px] text-[var(--text)]">{profile.address}</span>
            <button onClick={copy} className="shrink-0 text-[10px] text-[var(--muted)] transition hover:text-[var(--active)]">
              {copied ? t.profile.copied : t.profile.copy}
            </button>
          </div>
        </div>

        <div>
          <Label>{t.profile.nickname}</Label>
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                saveNick()
              }}
            >
              <Input value={nick} onChange={setNick} maxLength={20} autoFocus />
              <Button small type="submit">OK</Button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[var(--active)]">{profile.nickname}</span>
              <button
                onClick={() => {
                  setNick(profile.nickname)
                  setEditing(true)
                }}
                className="text-[10px] text-[var(--muted)] transition hover:text-[var(--active)]"
              >
                {t.profile.change}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={t.profile.stats.nodes} value={String(owned.length)} />
          <Stat label={t.profile.stats.value} value={`$${value}`} />
          <Stat label={t.profile.stats.whispers} value={String(whispers)} />
          <Stat label={t.profile.stats.ownThreads} value={String(threads)} />
          <Stat label={t.profile.stats.layers} value={`${layerCount}/6`} />
          <Stat label={t.profile.stats.roles} value={`${roleCount}/12`} />
        </div>

        <div className="flex flex-col gap-1 text-[10px] text-[var(--muted)]">
          <span>{t.profile.created}: {new Date(profile.createdAt).toLocaleString(locale)}</span>
          <span>{t.profile.lastLogin}: {new Date(profile.lastLoginAt).toLocaleString(locale)}</span>
        </div>

        {confirmUnlink ? (
          <div className="flex flex-col gap-2 border-2 border-[var(--accent)] p-3">
            <p className="text-[11px] leading-relaxed text-[var(--text)]">{t.profile.unlinkConfirm}</p>
            <div className="flex gap-2">
              <Button small danger onClick={() => disconnect()}>{t.profile.unlink}</Button>
              <Button small onClick={() => setConfirmUnlink(false)}>{t.profile.cancel}</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirmUnlink(true)}>{t.profile.unlinkWallet}</Button>
        )}
      </div>
    </Panel>
  )
}

interface OwnedLotCardProps {
  lot: Lot
  store: LotsStore
  onShowOnWeb: (lot: Lot) => void
}

function OwnedLotCard({ lot, store, onShowOnWeb }: OwnedLotCardProps) {
  const { log } = useArchive()
  const { lang } = useLanguage()
  const t = ui(lang)
  const [action, setAction] = useState<ActionKind | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const id = formatLotId(lot.id)
  const perk = rolePerk(lot)

  const STATUS_LABEL: Record<LotStatus, string> = {
    available: t.lots.filters.available,
    claimed: t.lots.filters.claimed,
    active: t.lots.filters.active,
    whisper: t.lots.filters.whisper,
  }

  const open = (kind: ActionKind) => {
    setError(null)
    setText(kind === 'rename' ? (lot.customName ?? '') : kind === 'whisper' ? (lot.whisper ?? '') : '')
    setAction(action === kind ? null : kind)
  }

  const submit = async () => {
    const value = text.trim()
    try {
      if (action === 'rename') {
        await store.rename(lot.id, value ? value.toUpperCase() : null)
        log(value ? lines.nodeRenamed(lang, id, value.toUpperCase()) : lines.nodeUnnamed(lang, id))
      } else if (action === 'whisper') {
        if (!value) return setError(t.profile.errors.whisperEmpty)
        await store.whisper(lot.id, value)
        log(lines.nodeWhispered(lang, id, value), 'alert')
      } else if (action === 'transfer') {
        if (!isValidAddress(value)) return setError(t.profile.errors.badAddress)
        const to = value.startsWith('0x') ? value.toLowerCase() : value
        await store.transfer(lot.id, to)
        log(lines.nodeTransferred(lang, id, shortenAddress(to)))
      } else if (action === 'sell') {
        await store.sell(lot.id)
        log(lines.nodeSold(lang, id, `$${lot.priceUsd.toFixed(2)}`), 'good')
      }
      setAction(null)
    } catch (err) {
      setError(translateApiError(err instanceof Error ? err.message : 'Request failed', lang))
    }
  }

  return (
    <div className="flex flex-col gap-2 border-2 border-[var(--muted)]/25 bg-[var(--bg)]/40 p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[var(--active)]">{id}</span>
          <span className="ml-1.5 text-[10px] text-[var(--muted)]">[{lot.ring}-{lot.ray}]</span>
          <div className="mt-0.5 text-[10px] text-[var(--muted)]">{lot.role}</div>
        </div>
        <span className={`text-[10px] ${lot.status === 'whisper' ? 'text-[var(--eye-glow)]' : 'text-[var(--text)]'}`}>
          {STATUS_LABEL[lot.status]}
        </span>
      </div>

      <div className="border-l-2 border-[var(--accent)] pl-2 text-[10px] leading-snug text-[var(--text)]">
        {perk.perk[lang]}
        <span className={`ml-1 ${perk.live ? 'text-[var(--eye-glow)]' : 'text-[var(--muted)]'}`}>
          {perk.live ? t.lotModal.active : t.lotModal.phase3}
        </span>
      </div>
      <div className="text-[11px]">
        <span className="text-[var(--muted)]">{t.lotModal.name}: </span>
        <span className="text-[var(--text)]">{lot.customName ?? '—'}</span>
      </div>
      {lot.whisper && (
        <div className="text-[11px]">
          <span className="text-[var(--muted)]">{t.lotModal.whisper}: </span>
          <span className="text-[var(--eye-glow)]">"{lot.whisper}"</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button small onClick={() => onShowOnWeb(lot)}>{t.profile.onWeb}</Button>
        <Button small active={action === 'rename'} onClick={() => open('rename')}>{t.profile.actions.rename}</Button>
        <Button small active={action === 'whisper'} onClick={() => open('whisper')}>{t.profile.actions.whisper}</Button>
        <Button small active={action === 'transfer'} onClick={() => open('transfer')}>{t.profile.actions.transfer}</Button>
        <Button small danger active={action === 'sell'} onClick={() => open('sell')}>{t.profile.actions.sell}</Button>
      </div>

      {action && (
        <form
          className="flex flex-col gap-2 border-t border-[var(--muted)]/20 pt-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {action === 'sell' ? (
            <p className="text-[11px] leading-relaxed text-[var(--text)]">
              {t.profile.sellConfirm(id, `$${lot.priceUsd.toFixed(2)}`)}
            </p>
          ) : (
            <Input
              value={text}
              onChange={setText}
              autoFocus
              maxLength={action === 'transfer' ? 64 : action === 'whisper' ? 80 : 20}
              placeholder={
                action === 'rename'
                  ? t.profile.placeholders.rename
                  : action === 'whisper'
                    ? t.profile.placeholders.whisper
                    : t.profile.placeholders.transfer
              }
            />
          )}
          {error && <p className="text-[10px] text-[var(--eye-glow)]">{error}</p>}
          <div className="flex gap-2">
            <Button small danger={action === 'sell'} type="submit">
              {action === 'sell' ? t.profile.confirm : t.profile.save}
            </Button>
            <Button small onClick={() => setAction(null)}>{t.profile.cancel}</Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-[9px] tracking-widest text-[var(--muted)]">{children}</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--muted)]/25 px-1 py-2">
      <div className="text-sm text-[var(--active)]">{value}</div>
      <div className="mt-1 text-[8px] tracking-widest text-[var(--muted)]">{label}</div>
    </div>
  )
}

interface InputProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  placeholder?: string
  autoFocus?: boolean
}

function Input({ value, onChange, maxLength, placeholder, autoFocus }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="min-w-0 flex-1 border-2 border-[var(--muted)]/40 bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--active)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--eye-glow)]"
    />
  )
}
