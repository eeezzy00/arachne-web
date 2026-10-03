import { useEffect, useRef, useState } from 'react'
import { useAmbientMusic } from '../audio/useAmbientMusic'
import { ui } from '../i18n/ui'
import { useLanguage } from '../state/LanguageContext'

const R = 44 // outer radius in viewBox units (viewBox is -50..50)
const HUB = 8
const SPOKES = 8
const RINGS = 5

function ringPoints(r: number): string {
  return Array.from({ length: SPOKES }, (_, i) => {
    const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

/** Volume control shaped like a small orb web: drag outward from the hub to turn it up. */
export default function WebVolume() {
  const { volume, muted, started, setVolume, toggleMute } = useAmbientMusic()
  const { lang } = useLanguage()
  const t = ui(lang)
  const svgRef = useRef<SVGSVGElement>(null)
  const [angle, setAngle] = useState(-Math.PI / 2)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState(false)
  const moved = useRef(false)

  const level = muted ? 0 : volume

  const fromPointer = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100 - 50
    const y = ((clientY - rect.top) / rect.height) * 100 - 50
    return { dist: Math.hypot(x, y), angle: Math.atan2(y, x) }
  }

  const apply = (clientX: number, clientY: number) => {
    const p = fromPointer(clientX, clientY)
    setAngle(p.angle)
    setVolume((p.dist - HUB) / (R - HUB))
  }

  // native listener: React's wheel handler is passive and can't stop the page scrolling
  useEffect(() => {
    const el = svgRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setVolume(level + (e.deltaY < 0 ? 0.05 : -0.05))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [level, setVolume])

  const thumbR = HUB + level * (R - HUB)
  const pct = Math.round(level * 100)

  return (
    <div className="relative flex items-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <svg
        ref={svgRef}
        viewBox="-50 -50 100 100"
        className={`h-9 w-9 cursor-pointer touch-none outline-none sm:h-11 sm:w-11 ${!started ? 'animate-pulse' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={t.volume.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={muted ? t.volume.muted : `${pct}%`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          moved.current = false
          setDragging(true)
          if (fromPointer(e.clientX, e.clientY).dist > HUB + 2) apply(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (!dragging) return
          moved.current = true
          apply(e.clientX, e.clientY)
        }}
        onPointerUp={(e) => {
          setDragging(false)
          if (!moved.current && fromPointer(e.clientX, e.clientY).dist <= HUB + 2) toggleMute()
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setVolume(level + 0.05)
          else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setVolume(level - 0.05)
          else if (e.key === 'm' || e.key === 'Enter' || e.key === ' ') toggleMute()
          else return
          e.preventDefault()
        }}
      >
        <circle r={49} fill="transparent" />
        {Array.from({ length: SPOKES }, (_, i) => {
          const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2
          return (
            <line
              key={i}
              x2={Math.cos(a) * R}
              y2={Math.sin(a) * R}
              strokeWidth={1.4}
              style={{ stroke: 'var(--web)', opacity: 0.35 }}
            />
          )
        })}
        {Array.from({ length: RINGS }, (_, i) => {
          const r = HUB + ((i + 1) / RINGS) * (R - HUB)
          const lit = level * RINGS >= i + 0.5
          return (
            <polygon
              key={i}
              points={ringPoints(r)}
              fill="none"
              strokeWidth={lit ? 2.6 : 1.4}
              style={{
                stroke: lit ? 'var(--eye-glow)' : 'var(--web)',
                opacity: lit ? 0.95 : 0.25,
                filter: lit ? 'drop-shadow(0 0 2px var(--eye-glow))' : undefined,
                transition: 'stroke 0.2s, opacity 0.2s',
              }}
            />
          )
        })}
        {level > 0 && (
          <rect
            x={Math.cos(angle) * thumbR - 4}
            y={Math.sin(angle) * thumbR - 4}
            width={8}
            height={8}
            shapeRendering="crispEdges"
            style={{ fill: 'var(--active)', filter: 'drop-shadow(0 0 3px var(--eye-glow))' }}
          />
        )}
        <circle r={HUB} strokeWidth={2} style={{ fill: 'var(--spider)', stroke: muted ? 'var(--muted)' : 'var(--eye)' }} />
        {muted ? (
          <path d="M-4,-4 L4,4 M4,-4 L-4,4" strokeWidth={2} style={{ stroke: 'var(--muted)' }} />
        ) : (
          <circle r={3} style={{ fill: 'var(--eye-glow)' }} />
        )}
      </svg>

      {(hover || dragging) && (
        <span
          className="pointer-events-none absolute top-full right-0 mt-1 border border-[var(--muted)]/40 bg-[var(--bg)]/95 px-2 py-1 text-[9px] whitespace-nowrap text-[var(--text)]"
          style={{ fontFamily: 'var(--font-data)' }}
        >
          {!started ? t.volume.hintStart : muted ? t.volume.hintMuted : t.volume.hintOn(pct)}
        </span>
      )}
    </div>
  )
}
