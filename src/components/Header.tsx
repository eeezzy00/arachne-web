import { ui } from '../i18n/ui'
import { useLanguage } from '../state/LanguageContext'
import { useWallet } from '../state/WalletContext'
import { shortenAddress } from '../utils/fakeWallet'
import LanguageSwitch from './LanguageSwitch'
import SpiderAvatar from './SpiderAvatar'
import { WalletIcon } from './WalletModal'
import WebVolume from './WebVolume'

export const HEADER_HEIGHT = 64

interface HeaderProps {
  onOpenProfile: () => void
  onHome: () => void
}

export default function Header({ onOpenProfile, onHome }: HeaderProps) {
  const { profile, openPicker, options, connectingId } = useWallet()
  const { lang } = useLanguage()
  const t = ui(lang)
  const walletOption = profile ? options.find((o) => o.id === profile.walletId) : undefined

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--surface)] px-4"
      style={{
        height: HEADER_HEIGHT,
        background: 'linear-gradient(to bottom, rgba(8,8,8,0.98), rgba(8,8,8,0.9))',
      }}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        <SpiderAvatar size={30} className="hidden sm:block" />
        <div className="min-w-0">
          <button
            onClick={onHome}
            className="whitespace-nowrap text-xs tracking-widest text-[var(--active)] sm:text-lg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ARACHNE
          </button>
          {profile && (
            <button
              onClick={onOpenProfile}
              className="mt-0.5 flex items-center gap-1.5 text-[10px] tracking-wide text-[var(--muted)] transition hover:text-[var(--active)]"
              style={{ fontFamily: 'var(--font-data)' }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--eye-glow)]" />
              {profile.nickname}
              {profile.demo && <span className="text-[var(--eye)]">· {t.header.demo}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageSwitch />
        <WebVolume />
        {profile ? (
          <button
            onClick={onOpenProfile}
            className="ml-1 flex items-center gap-2 border-2 border-[var(--muted)]/40 px-2.5 py-1.5 text-[11px] text-[var(--text)] transition hover:border-[var(--eye-glow)]"
            style={{ fontFamily: 'var(--font-data)' }}
          >
            <WalletIcon
              option={{
                icon: profile.walletIcon,
                badge: walletOption?.badge ?? profile.walletName.charAt(0),
                color: walletOption?.color ?? '#888',
              }}
              size={18}
            />
            <span className="hidden sm:inline">{shortenAddress(profile.address)}</span>
          </button>
        ) : (
          <button
            disabled={!!connectingId}
            className="ml-1 whitespace-nowrap border-2 border-[var(--accent)] bg-[var(--surface)] px-2 py-2 text-[9px] tracking-wider text-[var(--text)] transition hover:border-[var(--eye-glow)] hover:text-[var(--active)] disabled:opacity-50 sm:px-3 sm:text-xs"
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={openPicker}
          >
            {connectingId ? t.header.connecting : t.header.connect}
          </button>
        )}
      </div>
    </header>
  )
}
