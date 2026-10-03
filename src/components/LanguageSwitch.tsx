import { useState } from 'react'
import { useLanguage } from '../state/LanguageContext'
import { ui } from '../i18n/ui'

const R = 16

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

/** A small web-cell badge that toggles the UI language, styled to match the volume web. */
export default function LanguageSwitch() {
  const { lang, toggle } = useLanguage()
  const [hover, setHover] = useState(false)
  const t = ui(lang)

  return (
    <div className="relative flex items-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        onClick={toggle}
        aria-label={t.lang.label}
        className="flex h-9 w-9 cursor-pointer items-center justify-center outline-none sm:h-11 sm:w-11"
      >
        <svg viewBox="-20 -20 40 40" width={28} height={28}>
          <polygon
            points={hexPoints(R)}
            fill="var(--spider)"
            strokeWidth={1.4}
            style={{ stroke: 'var(--eye)', transition: 'stroke 0.2s' }}
          />
          <polygon points={hexPoints(R - 5)} fill="none" strokeWidth={1} style={{ stroke: 'var(--web)', opacity: 0.3 }} />
          <text
            x={0}
            y={1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            style={{ fill: 'var(--active)', fontFamily: 'var(--font-display)' }}
          >
            {lang.toUpperCase()}
          </text>
        </svg>
      </button>

      {hover && (
        <span
          className="pointer-events-none absolute top-full right-0 mt-1 border border-[var(--muted)]/40 bg-[var(--bg)]/95 px-2 py-1 text-[9px] whitespace-nowrap text-[var(--text)]"
          style={{ fontFamily: 'var(--font-data)' }}
        >
          {t.lang.hint}: {lang === 'en' ? 'EN → RU' : 'RU → EN'}
        </span>
      )}
    </div>
  )
}
