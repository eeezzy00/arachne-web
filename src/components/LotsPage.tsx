import { useMemo, useState } from 'react'
import { formatLotId, type Lot, type LotStatus } from '../data/lots'
import { ui } from '../i18n/ui'
import { useLanguage } from '../state/LanguageContext'
import { useWallet } from '../state/WalletContext'
import { shortenAddress } from '../utils/fakeWallet'

const STATUS_DOT: Record<LotStatus, string> = {
  available: 'bg-[var(--muted)]',
  claimed: 'bg-[var(--web)]',
  active: 'bg-[var(--active)]',
  whisper: 'bg-[var(--eye)]',
}

type Filter = LotStatus | 'all' | 'mine'

interface LotsPageProps {
  lots: Lot[]
  onOpenLot: (lot: Lot) => void
}

export default function LotsPage({ lots, onOpenLot }: LotsPageProps) {
  const { profile } = useWallet()
  const { lang } = useLanguage()
  const t = ui(lang)
  const [filter, setFilter] = useState<Filter>('all')
  const me = profile?.address ?? null

  const STATUS_LABEL: Record<LotStatus, string> = {
    available: t.lots.filters.available,
    claimed: t.lots.filters.claimed,
    active: t.lots.filters.active,
    whisper: t.lots.filters.whisper,
  }

  const FILTERS: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: t.lots.filters.all },
    { key: 'available', label: t.lots.filters.available },
    { key: 'claimed', label: t.lots.filters.claimed },
    { key: 'active', label: t.lots.filters.active },
    { key: 'whisper', label: t.lots.filters.whisper },
    { key: 'mine', label: t.lots.filters.mine },
  ]

  const filtered = useMemo(() => {
    if (filter === 'all') return lots
    if (filter === 'mine') return lots.filter((l) => me !== null && l.ownerAddress === me)
    return lots.filter((l) => l.status === filter)
  }, [lots, filter, me])

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-2 border-[var(--surface)] bg-[var(--surface)]/40 p-4"
      style={{ fontFamily: 'var(--font-data)' }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[10px] tracking-widest text-[var(--muted)]" style={{ fontFamily: 'var(--font-display)' }}>
          {t.lots.title} · {filtered.length}/{lots.length}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.filter((f) => f.key !== 'mine' || me).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`border px-2 py-1 text-[9px] tracking-wider transition ${
                filter === f.key
                  ? 'border-[var(--eye-glow)] text-[var(--active)]'
                  : 'border-[var(--muted)]/40 text-[var(--muted)] hover:border-[var(--muted)]'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="sticky top-0 bg-[var(--surface)] text-[var(--muted)]">
            <tr>
              <th className="px-2 py-2 font-normal">ID</th>
              <th className="px-2 py-2 font-normal">{t.lots.status}</th>
              <th className="px-2 py-2 font-normal">{t.lots.role}</th>
              <th className="hidden px-2 py-2 font-normal sm:table-cell">{t.lots.name}</th>
              <th className="hidden px-2 py-2 font-normal md:table-cell">{t.lots.owner}</th>
              <th className="px-2 py-2 text-right font-normal">{t.lots.price}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lot) => {
              const mine = me !== null && lot.ownerAddress === me
              return (
                <tr
                  key={lot.id}
                  onClick={() => onOpenLot(lot)}
                  className="cursor-pointer border-t border-[var(--muted)]/15 text-[var(--text)] hover:bg-[var(--bg)]/60"
                >
                  <td className="px-2 py-2 text-[var(--muted)]">
                    {formatLotId(lot.id)}
                    <span className="ml-1 text-[9px]">[{lot.ring}-{lot.ray}]</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 ${STATUS_DOT[lot.status]}`} />
                    {STATUS_LABEL[lot.status]}
                  </td>
                  <td className="px-2 py-2">{lot.role}</td>
                  <td className="hidden px-2 py-2 sm:table-cell">{lot.customName ?? '—'}</td>
                  <td className={`hidden px-2 py-2 md:table-cell ${mine ? 'text-[var(--eye-glow)]' : 'text-[var(--muted)]'}`}>
                    {mine ? t.lots.you : lot.ownerAddress ? shortenAddress(lot.ownerAddress) : '—'}
                  </td>
                  <td className="px-2 py-2 text-right">${lot.priceUsd.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
