import { useEffect, useMemo, useState } from 'react'
import { OWNER_RIGHTS, rolePerk } from '../data/lore'
import { formatLotId, type Lot } from '../data/lots'
import { getRoleArchetype } from '../data/roles'
import { translateApiError } from '../i18n/lines'
import { ui } from '../i18n/ui'
import { HUB_ID, WEB, lotNodeId } from '../sim/geometry'
import { useLanguage } from '../state/LanguageContext'
import { useWallet } from '../state/WalletContext'
import { shortenAddress } from '../utils/fakeWallet'
import Button from './ui/Button'
import Modal from './ui/Modal'

interface LotModalProps {
  lot: Lot | null
  lots: Lot[]
  onClose: () => void
  onPurchase: (lot: Lot) => Promise<void>
  onOpenProfile: () => void
}

export default function LotModal({ lot, lots, onClose, onPurchase, onOpenProfile }: LotModalProps) {
  const { profile, openPicker, pickerOpen } = useWallet()
  const { lang } = useLanguage()
  const t = ui(lang)
  const [buyingId, setBuyingId] = useState<number | null>(null)
  // keyed by lot id so switching lots can't show a stale error without an extra reset effect
  const [buyError, setBuyError] = useState<{ id: number; message: string } | null>(null)

  // threads that would come alive if this node were held: neighbours already held (or the core)
  const wouldWeave = useMemo(() => {
    if (!lot) return 0
    const held = new Set(lots.filter((l) => l.status !== 'available').map(lotNodeId))
    return WEB.adjacency.get(lotNodeId(lot))!.filter((s) => s.to === HUB_ID || held.has(s.to)).length
  }, [lot, lots])

  useEffect(() => {
    // the wallet picker stacks on top of this modal and owns Escape while open
    if (!lot || pickerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lot, pickerOpen, onClose])

  if (!lot) return null

  const STATUS_LABEL: Record<Lot['status'], string> = {
    available: t.lots.filters.available,
    claimed: t.lots.filters.claimed,
    active: t.lots.filters.active,
    whisper: t.lots.filters.whisper,
  }

  const isOwner = profile !== null && lot.ownerAddress === profile.address
  const buying = buyingId === lot.id
  const perk = rolePerk(lot)
  const patternGain = ((1 + wouldWeave) / (lots.length + WEB.edges.length)) * 100

  const buy = async () => {
    if (!profile) return
    setBuyingId(lot.id)
    setBuyError(null)
    try {
      // payment itself is still simulated until Phase 4; the claim is real
      await new Promise((resolve) => setTimeout(resolve, 500))
      await onPurchase(lot)
    } catch (err) {
      setBuyError({
        id: lot.id,
        message: translateApiError(err instanceof Error ? err.message : 'Purchase failed', lang),
      })
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <Modal title={`${t.lotModal.node} ${formatLotId(lot.id)}`} onClose={buying ? undefined : onClose}>
      <div className="flex flex-col gap-2 text-xs">
        <Row label={t.lotModal.ringRay} value={`${lot.ring} / ${lot.ray}`} />
        <Row label={t.lotModal.status} value={STATUS_LABEL[lot.status]} accent={lot.status !== 'available'} />
        <Row label={t.lotModal.role} value={lot.role} />
        <Row label={t.lotModal.name} value={lot.customName ?? '—'} />
        <Row label={t.lotModal.owner} value={isOwner ? t.lotModal.you : lot.ownerAddress ? shortenAddress(lot.ownerAddress) : '—'} />
        <Row label={t.lotModal.price} value={`$${lot.priceUsd.toFixed(2)}`} />
        {lot.whisper && <Row label={t.lotModal.whisper} value={`"${lot.whisper}"`} accent />}
      </div>

      <p className="mt-3 border-t border-[var(--muted)]/20 pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        {lot.roleDescription}
      </p>

      <div className="mt-3 border-t border-[var(--muted)]/20 pt-3 text-[11px] leading-relaxed">
        <div className="mb-1.5 text-[9px] tracking-widest text-[var(--muted)]">{t.lotModal.whatItGrants}</div>
        <div className="mb-2 border-l-2 border-[var(--eye-glow)] pl-2 text-[var(--active)]">
          {getRoleArchetype(lot.ray).name[lang]}: {perk.perk[lang]}
          <span className={`ml-1.5 text-[9px] ${perk.live ? 'text-[var(--eye-glow)]' : 'text-[var(--muted)]'}`}>
            {perk.live ? t.lotModal.active : t.lotModal.phase3}
          </span>
        </div>
        <ul className="flex flex-col gap-0.5 text-[var(--muted)]">
          {OWNER_RIGHTS[lang].map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
        {lot.status === 'available' && (
          <div className="mt-2 text-[var(--text)]">
            {t.lotModal.willWeave(wouldWeave, t.lotModal.threadWord(wouldWeave))}
            {patternGain.toFixed(1)}%
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isOwner ? (
          <>
            <div className="border-2 border-[var(--eye-glow)]/60 px-3 py-2 text-center text-[10px] tracking-wider text-[var(--active)]">
              {t.lotModal.thisIsYours}
            </div>
            <Button full onClick={onOpenProfile}>{t.lotModal.manageInProfile}</Button>
          </>
        ) : lot.status !== 'available' ? (
          <div className="border-2 border-[var(--muted)]/20 px-3 py-2 text-center text-[10px] tracking-wider text-[var(--muted)]">
            {t.lotModal.belongsToOther}
          </div>
        ) : profile ? (
          <>
            <Button full danger disabled={buying} onClick={buy}>
              {buying ? t.lotModal.transacting : t.lotModal.buyFor(`$${lot.priceUsd.toFixed(2)}`)}
            </Button>
            {buyError?.id === lot.id && (
              <p className="text-center text-[10px] text-[var(--eye-glow)]">{buyError.message}</p>
            )}
          </>
        ) : (
          <Button full onClick={openPicker}>{t.lotModal.connectWallet}</Button>
        )}
      </div>
    </Modal>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--muted)]/20 pb-1">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className={`text-right ${accent ? 'text-[var(--eye-glow)]' : 'text-[var(--text)]'}`}>{value}</span>
    </div>
  )
}
