import { useEffect } from 'react'
import { translateApiError } from '../i18n/lines'
import { ui } from '../i18n/ui'
import { useLanguage } from '../state/LanguageContext'
import { useWallet, type WalletOption } from '../state/WalletContext'
import Modal from './ui/Modal'

export function WalletIcon({ option, size = 28 }: { option: Pick<WalletOption, 'icon' | 'badge' | 'color'>; size?: number }) {
  if (option.icon) {
    return <img src={option.icon} alt="" width={size} height={size} className="shrink-0" />
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center text-[10px] text-black"
      style={{ width: size, height: size, background: option.color, fontFamily: 'var(--font-display)' }}
    >
      {option.badge}
    </span>
  )
}

export default function WalletModal() {
  const { pickerOpen, closePicker, options, connect, connectingId, error } = useWallet()
  const { lang } = useLanguage()
  const t = ui(lang)

  useEffect(() => {
    if (!pickerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !connectingId && closePicker()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerOpen, connectingId, closePicker])

  if (!pickerOpen) return null
  const connecting = options.find((o) => o.id === connectingId)

  return (
    <Modal title={t.wallet.title} onClose={connectingId ? undefined : closePicker}>
      <p className="mb-4 text-[11px] leading-relaxed text-[var(--muted)]">{t.wallet.intro}</p>

      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const busy = connectingId === option.id
          return (
            <button
              key={option.id}
              disabled={!!connectingId}
              onClick={() => connect(option)}
              className={`flex items-center gap-3 border-2 px-3 py-2.5 text-left transition disabled:cursor-wait ${
                busy
                  ? 'border-[var(--eye-glow)] bg-[var(--bg)]'
                  : 'border-[var(--muted)]/30 hover:border-[var(--eye-glow)] hover:bg-[var(--bg)]/60 disabled:opacity-50'
              }`}
            >
              <WalletIcon option={option} />
              <span className="flex-1">
                <span className="block text-xs text-[var(--active)]">{option.name}</span>
                <span className="block text-[9px] tracking-wider text-[var(--muted)]">
                  {option.chain === 'solana' ? 'SOLANA' : 'EVM'}
                </span>
              </span>
              <span
                className={`text-[8px] tracking-wider ${option.demo ? 'text-[var(--muted)]' : 'text-[var(--active)]'}`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {busy ? '...' : option.demo ? t.wallet.demo : t.wallet.found}
              </span>
            </button>
          )
        })}
      </div>

      {connecting && (
        <p className="mt-4 text-[11px] text-[var(--text)]" style={{ animation: 'blink-cursor 1.2s steps(1) infinite' }}>
          {connecting.demo ? t.wallet.simulating : t.wallet.confirmIn(connecting.name.toUpperCase())}
        </p>
      )}
      {error && <p className="mt-4 text-[11px] text-[var(--eye-glow)]">{translateApiError(error, lang)}</p>}

      <p className="mt-4 border-t border-[var(--muted)]/20 pt-3 text-[10px] leading-relaxed text-[var(--muted)]">
        {t.wallet.footer}
      </p>
    </Modal>
  )
}
