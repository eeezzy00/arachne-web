import { useMemo } from 'react'
import { ARACHNE_LORE, PATTERN_STAGES } from '../data/lore'
import type { Lot } from '../data/lots'
import { ui } from '../i18n/ui'
import { computePattern } from '../sim/pattern'
import { useLanguage } from '../state/LanguageContext'
import Panel from './ui/Panel'

interface PatternPanelProps {
  lots: Lot[]
  onReadMore: () => void
}

export default function PatternPanel({ lots, onReadMore }: PatternPanelProps) {
  const { lang } = useLanguage()
  const t = ui(lang)
  const p = useMemo(() => computePattern(lots), [lots])
  const pct = Math.round(p.progress * 100)

  return (
    <Panel title={t.pattern.title} grow={false}>
      <p className="mb-3 text-[11px] leading-relaxed text-[var(--muted)]">{ARACHNE_LORE.short[lang]}</p>

      <div className="mb-1 flex items-end justify-between">
        <span className="text-[10px] text-[var(--muted)]">{t.pattern.woven}</span>
        <span className="text-lg leading-none text-[var(--active)]" style={{ fontFamily: 'var(--font-display)' }}>
          {pct}%
        </span>
      </div>
      <div className="relative h-3 border border-[var(--muted)]/40 bg-[var(--bg)]">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #8b0000, #ff2a2a 70%, #ffd0d0)',
            boxShadow: '0 0 10px rgba(255,42,42,0.5)',
            transition: 'width 0.8s ease',
          }}
        />
        {PATTERN_STAGES.slice(0, -1).map((s) => (
          <span
            key={s.title.en}
            className={`absolute top-[-3px] h-[16px] w-px ${p.progress >= s.threshold ? 'bg-[var(--active)]' : 'bg-[var(--muted)]'}`}
            style={{ left: `${s.threshold * 100}%` }}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-[var(--muted)]">
        <span>
          {t.pattern.nodes} <span className="text-[var(--text)]">{p.ownedNodes}/{p.totalNodes}</span>
        </span>
        <span className="text-right">
          {t.pattern.livingThreads} <span className="text-[var(--eye-glow)]">{p.livingThreads}/{p.totalThreads}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-[10px]">
        {p.reached && (
          <div>
            <span className="text-[var(--eye-glow)]">✓ {p.reached.title[lang]}</span>
            <span className="text-[var(--muted)]"> — {p.reached.reward[lang]}</span>
          </div>
        )}
        {p.next && (
          <div>
            <span className="text-[var(--text)]">
              ◇ {p.next.title[lang]} · {Math.round(p.next.threshold * 100)}%
            </span>
            <span className="text-[var(--muted)]"> — {p.next.reward[lang]}</span>
          </div>
        )}
      </div>

      <button
        onClick={onReadMore}
        className="mt-3 self-start text-[10px] text-[var(--muted)] underline decoration-dotted transition hover:text-[var(--active)]"
      >
        {t.pattern.readLore}
      </button>
    </Panel>
  )
}
