import { useMemo } from 'react'
import type { ArchiveCategory, ArchiveTone } from '../data/archive'
import { ui } from '../i18n/ui'
import { useArchive } from '../state/ArchiveContext'
import { useLanguage } from '../state/LanguageContext'
import Panel from './ui/Panel'

const TONE_CLASS: Record<ArchiveTone, string> = {
  normal: 'text-[var(--text)]',
  alert: 'text-[var(--eye-glow)]',
  dim: 'text-[var(--muted)]',
  good: 'text-[var(--active)]',
}

const CATEGORY_TAG: Record<ArchiveCategory, { en: string; ru: string }> = {
  sync: { en: 'SYNC', ru: 'СИНХР' },
  whisper: { en: 'WHSP', ru: 'ШЁПОТ' },
  validate: { en: 'VLD', ru: 'ВАЛИД' },
  anomaly: { en: 'ANOM', ru: 'АНОМ' },
  active: { en: 'ACT', ru: 'АКТВ' },
  silence: { en: 'SIL', ru: 'ТИШЬ' },
  slot: { en: 'SLOT', ru: 'СЛОТ' },
  system: { en: 'SYS', ru: 'СИСТ' },
}

export default function ArchiveFeed() {
  const { entries } = useArchive()
  const { lang } = useLanguage()
  const t = ui(lang)

  const alertCount = useMemo(() => entries.filter((e) => e.tone === 'alert').length, [entries])

  return (
    <Panel
      title={t.archive.title}
      aside={
        <span className="text-[9px] tracking-wider text-[var(--muted)]">
          {entries.length} {t.archive.total}
          {alertCount > 0 && (
            <>
              {' · '}
              <span className="text-[var(--eye-glow)]">
                {alertCount} {t.archive.alerts}
              </span>
            </>
          )}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden text-[11px] leading-snug">
        {entries.map((entry, idx) => (
          <p
            key={entry.id}
            className={`${TONE_CLASS[entry.tone]} archive-line`}
            style={{ opacity: Math.max(0.35, 1 - idx * 0.04) }}
          >
            <span className="mr-1 inline-block w-[38px] shrink-0 text-center text-[8px] tracking-wider text-[var(--muted)]/70">
              {CATEGORY_TAG[entry.category][lang]}
            </span>
            <span className="text-[var(--muted)]">[{entry.time}]</span> {entry.text}
            {idx === 0 && (
              <span
                className="ml-1 inline-block h-3 w-1.5 bg-[var(--active)] align-middle"
                style={{ animation: 'blink-cursor 1s steps(1) infinite' }}
              />
            )}
          </p>
        ))}
      </div>
    </Panel>
  )
}
