import { useCallback, useEffect, useRef, useState } from 'react'
import Header, { HEADER_HEIGHT } from './components/Header'
import WebScene from './components/web/WebScene'
import LotModal from './components/LotModal'
import WalletModal from './components/WalletModal'
import ArchiveFeed from './components/ArchiveFeed'
import ChatPanel from './components/ChatPanel'
import PatternPanel from './components/PatternPanel'
import LotsPage from './components/LotsPage'
import ProfilePage from './components/ProfilePage'
import FaqPage from './components/FaqPage'
import BackgroundFX from './components/BackgroundFX'
import SpiderAvatar from './components/SpiderAvatar'
import Panel from './components/ui/Panel'
import { ARACHNE_LORE } from './data/lore'
import { formatLotId, type Lot } from './data/lots'
import { randomLogEntry } from './data/archive'
import { lines } from './i18n/lines'
import { ui } from './i18n/ui'
import { useArchive } from './state/ArchiveContext'
import { useLanguage } from './state/LanguageContext'
import { useLotsStore } from './state/useLotsStore'
import { useWallet } from './state/WalletContext'

type Tab = 'hub' | 'lots' | 'profile' | 'faq'

/** how much of the panel peeks above the fold before any scrolling */
const PEEK = 58
/** how much of the web stays visible above the panel when fully scrolled */
const SLIVER = '20dvh'

function App() {
  const store = useLotsStore()
  const { lots } = store
  const { profile } = useWallet()
  const { log, push } = useArchive()
  const { lang } = useLanguage()
  const t = ui(lang)

  const [tab, setTab] = useState<Tab>('hub')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tear, setTear] = useState<string | null>(null)
  const [raised, setRaised] = useState(false)
  const [celebrateLotId, setCelebrateLotId] = useState<number | null>(null)
  const selectedLot = lots.find((l) => l.id === selectedId) ?? null

  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const lotsRef = useRef(lots)
  useEffect(() => {
    lotsRef.current = lots
  }, [lots])

  useEffect(() => {
    push(randomLogEntry(lotsRef.current, lang))
    const timer = setInterval(() => push(randomLogEntry(lotsRef.current, lang)), 5200)
    return () => clearInterval(timer)
  }, [push, lang])

  // the web recedes into the background as the panel slides over it
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      const el = backdropRef.current
      if (el) {
        el.style.transform = `translateY(${(-p * 2).toFixed(2)}dvh) scale(${(1 - 0.14 * p).toFixed(4)})`
        el.style.opacity = (1 - 0.35 * p).toFixed(3)
      }
      setRaised(p > 0.5)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const raisePanel = useCallback((next?: Tab) => {
    if (next) setTab(next)
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }, [])
  const lowerPanel = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [])

  const showOnWeb = useCallback(
    (lot: Lot) => {
      setSelectedId(lot.id)
      lowerPanel()
    },
    [lowerPanel],
  )

  const purchase = useCallback(
    async (lot: Lot) => {
      await store.purchase(lot.id)
      log(lines.nodeClaimed(lang, formatLotId(lot.id), `$${lot.priceUsd.toFixed(2)}`, lot.role), 'good')
      setCelebrateLotId(lot.id)
    },
    [store, log, lang],
  )

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'hub', label: t.tabs.hub },
    { key: 'lots', label: t.tabs.lots },
    { key: 'profile', label: t.tabs.profile },
    { key: 'faq', label: t.tabs.faq },
  ]

  return (
    <div className="relative">
      <BackgroundFX />
      <Header onOpenProfile={() => raisePanel('profile')} onHome={lowerPanel} />

      {/* the web is a fixed backdrop; the page scrolls over it */}
      <div
        className="fixed inset-x-0 bottom-0 z-0 flex items-start justify-center px-3 pt-2 [container-type:size]"
        style={{ top: HEADER_HEIGHT }}
      >
        <div
          ref={backdropRef}
          className="relative"
          style={{
            width: `min(100cqw, calc(100cqh - ${PEEK + 8}px))`,
            height: `min(100cqw, calc(100cqh - ${PEEK + 8}px))`,
            transformOrigin: '50% 0%',
            willChange: 'transform, opacity',
          }}
        >
          <WebScene
            lots={lots}
            ownerAddress={profile?.address ?? null}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={(lot) => setSelectedId(lot.id)}
            onHover={setHoveredId}
            onTearChange={setTear}
            celebrateLotId={celebrateLotId}
            onCelebrated={() => setCelebrateLotId(null)}
          />
        </div>
      </div>

      {/* transparent scroll runway — clicks fall through to the web */}
      <div className="pointer-events-none relative z-10" style={{ height: `calc(100dvh - ${PEEK}px)` }} />

      <section
        ref={panelRef}
        className="relative z-10 flex flex-col overflow-hidden border-t-2 border-[var(--accent)]"
        style={{
          height: `calc(100dvh - ${HEADER_HEIGHT}px - ${SLIVER})`,
          background: 'linear-gradient(to bottom, rgba(12,10,10,0.97), rgba(8,8,8,0.99) 30%)',
          boxShadow: '0 -24px 60px rgba(0,0,0,0.85), 0 -1px 16px rgba(204,0,0,0.35)',
        }}
      >
        <div className="panel-watermark">
          <SpiderAvatar size={340} className="panel-watermark-spider" />
        </div>

        <div
          className="relative flex shrink-0 items-center justify-between gap-3 border-b border-[var(--surface)] px-3"
          style={{ height: PEEK }}
        >
          <nav className="flex gap-1.5">
            {TABS.map((tabItem) => (
              <button
                key={tabItem.key}
                onClick={() => raisePanel(tabItem.key)}
                className={`border-2 px-2.5 py-1.5 text-[9px] tracking-wider transition sm:px-3 sm:text-[10px] ${
                  tab === tabItem.key
                    ? 'border-[var(--eye-glow)] bg-[var(--bg)]/60 text-[var(--active)]'
                    : 'border-[var(--surface)] text-[var(--muted)] hover:border-[var(--muted)]'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {tabItem.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => (raised ? lowerPanel() : raisePanel())}
            className="hidden text-[9px] tracking-widest text-[var(--muted)] transition hover:text-[var(--active)] sm:block"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {raised ? t.panel.up : t.panel.down}
          </button>
        </div>

        <div className={`relative min-h-0 flex-1 p-3 ${tab === 'hub' ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-hidden'}`}>
          {tab === 'hub' && (
            <div className="flex flex-col gap-3 lg:grid lg:h-full lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)]">
              <div className="flex flex-col gap-3 lg:min-h-0">
                <PatternPanel lots={lots} onReadMore={() => setTab('faq')} />
                <div className="hidden min-h-0 flex-1 flex-col lg:flex">
                  <Panel title={t.lore.title} scroll>
                    {ARACHNE_LORE.long[lang].map((p) => (
                      <p key={p} className="mb-3 text-[11px] leading-relaxed text-[var(--muted)]">
                        {p}
                      </p>
                    ))}
                  </Panel>
                </div>
              </div>
              <div className="flex h-[440px] flex-col lg:h-auto lg:min-h-0">
                <ChatPanel lots={lots} tear={tear} />
              </div>
              <div className="flex h-[320px] flex-col lg:h-auto lg:min-h-0">
                <ArchiveFeed />
              </div>
            </div>
          )}
          {tab === 'lots' && <LotsPage lots={lots} onOpenLot={showOnWeb} />}
          {tab === 'profile' && <ProfilePage store={store} onShowOnWeb={showOnWeb} onGoToWeb={lowerPanel} />}
          {tab === 'faq' && <FaqPage />}
        </div>
      </section>

      <LotModal
        lot={selectedLot}
        lots={lots}
        onClose={() => setSelectedId(null)}
        onPurchase={purchase}
        onOpenProfile={() => {
          setSelectedId(null)
          raisePanel('profile')
        }}
      />
      <WalletModal />
    </div>
  )
}

export default App
