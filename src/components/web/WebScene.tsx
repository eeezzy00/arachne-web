import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatLotId, type Lot } from '../../data/lots'
import { lines } from '../../i18n/lines'
import {
  CENTER,
  HUB_ID,
  SIZE,
  WEB,
  anchorThreads,
  lotNodeId,
  nodePos,
  quadPoint,
  spiralThreads,
  stepPoint,
  type Edge,
} from '../../sim/geometry'
import { livingEdges } from '../../sim/pattern'
import { createSimShared } from '../../sim/shared'
import { useArchive } from '../../state/ArchiveContext'
import { useChat } from '../../state/ChatContext'
import { useLanguage } from '../../state/LanguageContext'
import CoreNode, { PULSE_SECONDS } from './CoreNode'
import FlowAgent from './FlowAgent'
import Spider, { type SpiderCallbacks } from './Spider'

const STATUS_LABEL = {
  en: { available: 'FREE', claimed: 'CLAIMED', active: 'ACTIVE', whisper: 'WHISPER' },
  ru: { available: 'СВОБОДЕН', claimed: 'ЗАНЯТ', active: 'АКТИВЕН', whisper: 'ШЁПОТ' },
} as const

const SPIRALS_D = spiralThreads().join(' ')
const ANCHORS_D = anchorThreads().join(' ')
const FIRST_BREAK_MS = 9000
/** how long the post-purchase pulse plays before the web settles back to normal */
const CELEBRATE_MS = 2800

const NOOP_CALLBACKS: SpiderCallbacks = {
  onArrive: () => {},
  onHeadToRepair: () => {},
  onRepairStart: () => {},
  onRepairDone: () => {},
  onCelebrate: () => {},
}

interface WebSceneProps {
  lots: Lot[]
  ownerAddress: string | null
  selectedId: number | null
  hoveredId: number | null
  onSelect: (lot: Lot) => void
  onHover: (id: number | null) => void
  onTearChange: (label: string | null) => void
  /** id of a lot just purchased — the spider walks there, then the web pulses */
  celebrateLotId: number | null
  onCelebrated: () => void
}

export default function WebScene({
  lots,
  ownerAddress,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onTearChange,
  celebrateLotId,
  onCelebrated,
}: WebSceneProps) {
  const { log } = useArchive()
  const { spiderSay } = useChat()
  const { lang } = useLanguage()
  const simRef = useRef(createSimShared())
  const lotsRef = useRef(lots)
  const [broken, setBroken] = useState<Edge | null>(null)
  const [repairing, setRepairing] = useState(false)
  const [celebrateNodeId, setCelebrateNodeId] = useState<string | null>(null)
  const breaks = useRef(0)

  useEffect(() => {
    lotsRef.current = lots
  }, [lots])

  const labelOf = useMemo(() => {
    const byNode = new Map(lots.map((l) => [lotNodeId(l), l]))
    return (id: string) => (id === HUB_ID ? (lang === 'en' ? 'CENTER' : 'ЦЕНТР') : formatLotId(byNode.get(id)!.id))
  }, [lots, lang])

  const living = useMemo(() => livingEdges(lots), [lots])

  // hand the spider a route to the node that was just bought
  useEffect(() => {
    if (celebrateLotId == null) return
    const lot = lots.find((l) => l.id === celebrateLotId)
    if (lot) simRef.current.celebrateTarget = lotNodeId(lot)
    onCelebrated()
  }, [celebrateLotId, lots, onCelebrated])

  const callbacksRef = useRef<SpiderCallbacks>(NOOP_CALLBACKS)
  useLayoutEffect(() => {
    const label = (e: Edge) => `${labelOf(e.a)} ↔ ${labelOf(e.b)}`
    callbacksRef.current = {
      onArrive: (nodeId, purpose) => {
        if (purpose === 'home' && Math.random() < 0.5) log(lines.agentHome(lang), 'dim')
        if (purpose === 'patrol') log(lines.agentListens(lang, labelOf(nodeId)), 'dim')
      },
      onHeadToRepair: (edge) => {
        log(lines.agentHeadsToTear(lang, label(edge)))
        if (Math.random() < 0.5) spiderSay(lines.spiderTearSay(lang, label(edge)))
      },
      onRepairStart: () => {
        setRepairing(true)
        log(lines.agentWeaving(lang))
      },
      onRepairDone: (edge) => {
        simRef.current.broken = null
        setBroken(null)
        setRepairing(false)
        onTearChange(null)
        log(lines.threadRestored(lang, label(edge)), 'good')
        if (Math.random() < 0.3) spiderSay(lines.spiderRepairDoneSay(lang))
      },
      onCelebrate: (nodeId) => {
        setCelebrateNodeId(nodeId)
        window.setTimeout(() => setCelebrateNodeId(null), CELEBRATE_MS)
        log(lines.agentInspects(lang, labelOf(nodeId)), 'good')
        spiderSay(lines.spiderCelebrateSay(lang))
      },
    }
  }, [log, labelOf, spiderSay, onTearChange, lang])

  // every so often a thread snaps somewhere nobody is standing
  useEffect(() => {
    if (broken) return
    const delay = breaks.current === 0 ? FIRST_BREAK_MS : 22000 + Math.random() * 25000
    const timer = setTimeout(() => {
      const sim = simRef.current
      const candidates = WEB.edges.filter((e) => e.a !== HUB_ID && !sim.busyEdges.has(e.id))
      const edge = candidates[Math.floor(Math.random() * candidates.length)]
      if (!edge) return
      breaks.current += 1
      sim.broken = edge
      setBroken(edge)
      const label = `${labelOf(edge.a)} ↔ ${labelOf(edge.b)}`
      onTearChange(label)
      log(lines.threadTorn(lang, label), 'alert')
    }, delay)
    return () => clearTimeout(timer)
  }, [broken, log, labelOf, onTearChange, lang])

  const hovered = hoveredId !== null ? lots.find((l) => l.id === hoveredId) : undefined
  const hoveredPos = hovered ? nodePos(lotNodeId(hovered)) : null

  const intactD = useMemo(
    () =>
      WEB.edges
        .filter((e) => e.id !== broken?.id)
        .map((e) => e.d)
        .join(' '),
    [broken],
  )
  const livingD = useMemo(
    () =>
      living
        .filter((e) => e.id !== broken?.id)
        .map((e) => e.d)
        .join(' '),
    [living, broken],
  )
  const repairRef = (el: SVGPathElement | null) => {
    if (!el) return
    simRef.current.repairEls.add(el)
    return () => {
      simRef.current.repairEls.delete(el)
    }
  }

  const celebratePos = celebrateNodeId ? nodePos(celebrateNodeId) : null

  return (
    <div className={`relative h-full w-full ${celebrateNodeId ? 'celebrating' : ''}`}>
      {/*
        The silk is split into stacked layers. Static layers are rasterised once and
        only moved/faded by the GPU; only the thin pulse layer and the interactive
        layer repaint each frame. Animated paint (gradients, filters) on every thread
        re-rendered the whole web each frame and made it flicker while scrolling.
      */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="web-layer silk">
        <defs>
          <radialGradient id="silk-cool" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={470}>
            <stop offset="0" stopColor="#ff2a2a" />
            <stop offset="0.16" stopColor="#ff6a6a" />
            <stop offset="0.62" stopColor="#ececec" />
            <stop offset="1" stopColor="#9a9a9a" />
          </radialGradient>
        </defs>
        <g fill="none" style={{ stroke: 'url(#silk-cool)' }}>
          <path d={ANCHORS_D} strokeWidth={1} opacity={0.2} />
          <path d={SPIRALS_D} strokeWidth={0.7} opacity={0.2} />
          <path d={intactD} strokeWidth={1.3} opacity={0.6} />
          {broken && <RepairPath edge={broken} strokeWidth={1.3} opacity={0.6} repairRef={repairRef} />}
        </g>
      </svg>

      {/* a warmer copy of the silk; fading it in and out makes the web breathe red ↔ white */}
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="web-layer silk warm">
        <defs>
          <radialGradient id="silk-warm" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={470}>
            <stop offset="0" stopColor="#ff2a2a" />
            <stop offset="0.45" stopColor="#ff8f8f" />
            <stop offset="0.8" stopColor="#ffd2d2" />
            <stop offset="1" stopColor="#b09a9a" />
          </radialGradient>
        </defs>
        <g fill="none" style={{ stroke: 'url(#silk-warm)' }}>
          <path d={intactD} strokeWidth={1.3} opacity={0.65} />
          {broken && <RepairPath edge={broken} strokeWidth={1.3} opacity={0.65} repairRef={repairRef} />}
        </g>
      </svg>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="web-layer silk living">
        <path d={livingD} fill="none" stroke="#ff2a2a" strokeWidth={3.4} strokeLinecap="round" />
      </svg>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="web-layer silk">
        <defs>
          {/* a ring of light the core sends down every thread */}
          <radialGradient id="pulse-grad" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={10}>
            <animate attributeName="r" values="10;560" dur={`${PULSE_SECONDS}s`} repeatCount="indefinite" />
            <stop offset="0" stopColor="#ff3b3b" stopOpacity={0} />
            <stop offset="0.8" stopColor="#ff3b3b" stopOpacity={0} />
            <stop offset="0.93" stopColor="#ff8a8a" stopOpacity={0.95}>
              <animate
                attributeName="stop-opacity"
                values="0.95;0.7;0.1"
                dur={`${PULSE_SECONDS}s`}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="1" stopColor="#ff3b3b" stopOpacity={0} />
          </radialGradient>
        </defs>
        <g fill="none" opacity={0.9} style={{ stroke: 'url(#pulse-grad)' }}>
          <path d={intactD} strokeWidth={2.2} />
          {broken && <RepairPath edge={broken} strokeWidth={2.2} repairRef={repairRef} />}
        </g>
      </svg>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="web-layer interactive select-none">
        <defs>
          <radialGradient id="node-glow">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.45} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="node-glow-red">
            <stop offset="0" stopColor="#ff2020" stopOpacity={0.6} />
            <stop offset="1" stopColor="#ff2020" stopOpacity={0} />
          </radialGradient>
        </defs>

        {broken && (
          <BrokenThread
            key={broken.id}
            edge={broken}
            repairing={repairing}
            freshRef={(el) => {
              simRef.current.freshEl = el
            }}
          />
        )}

        <CoreNode />

        {lots.map((lot) => {
          const { x, y } = nodePos(lotNodeId(lot))
          const big = hoveredId === lot.id || selectedId === lot.id
          const size = big ? 12 : 8
          const mine = ownerAddress !== null && lot.ownerAddress === ownerAddress
          return (
            <g
              key={lot.id}
              transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`}
              onMouseEnter={() => onHover(lot.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(lot)}
              className="cursor-pointer"
            >
              <circle r={16} fill="transparent" />
              {mine && <rect x={-11} y={-11} width={22} height={22} className="lot-mine" />}
              <g
                style={{
                  animation: `node-ambient ${2.6 + (lot.id % 5) * 0.3}s ease-in-out infinite`,
                  animationDelay: `${(lot.id % 12) * 140}ms`,
                }}
              >
                <circle
                  r={lot.status === 'available' ? 8 : 13}
                  fill={lot.status === 'whisper' || lot.status === 'active' ? 'url(#node-glow-red)' : 'url(#node-glow)'}
                />
                <rect x={-size / 2} y={-size / 2} width={size} height={size} className={`lot-node lot-${lot.status}`} />
              </g>
            </g>
          )
        })}

        {celebratePos && (
          <g transform={`translate(${celebratePos.x.toFixed(1)}, ${celebratePos.y.toFixed(1)})`} pointerEvents="none">
            <circle r={6} className="purchase-burst purchase-burst-1" />
            <circle r={6} className="purchase-burst purchase-burst-2" />
            <circle r={6} className="purchase-burst purchase-burst-3" />
          </g>
        )}

        {[0, 1, 2].map((seed) => (
          <FlowAgent key={seed} simRef={simRef} seed={seed} />
        ))}
      </svg>

      <Spider simRef={simRef} lotsRef={lotsRef} callbacksRef={callbacksRef} />

      {hovered && hoveredPos && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 border border-[var(--muted)]/50 bg-[var(--bg)]/90 px-2 py-1 text-[10px] whitespace-nowrap text-[var(--text)]"
          style={{
            left: `${hoveredPos.x / 10}%`,
            top: `calc(${hoveredPos.y / 10}% - 38px)`,
            fontFamily: 'var(--font-data)',
          }}
        >
          <span className="text-[var(--active)]">{formatLotId(hovered.id)}</span> · {hovered.role} ·{' '}
          <span className={hovered.status === 'available' ? 'text-[var(--muted)]' : 'text-[var(--eye-glow)]'}>
            {STATUS_LABEL[lang][hovered.status]}
          </span>
        </div>
      )}
    </div>
  )
}

interface RepairPathProps {
  edge: Edge
  strokeWidth: number
  opacity?: number
  repairRef: (el: SVGPathElement | null) => (() => void) | undefined
}

/** The torn thread in one silk layer, revealed as the spider re-spins it — so new silk matches old. */
function RepairPath({ edge, strokeWidth, opacity, repairRef }: RepairPathProps) {
  return (
    <path
      d={edge.d}
      pathLength={1}
      strokeWidth={strokeWidth}
      opacity={opacity}
      style={{ strokeDasharray: '0 3' }}
      ref={repairRef}
    />
  )
}

interface BrokenThreadProps {
  edge: Edge
  repairing: boolean
  freshRef: (el: SVGPathElement | null) => void
}

function BrokenThread({ edge, repairing, freshRef }: BrokenThreadProps) {
  const a = nodePos(edge.a)
  const b = nodePos(edge.b)
  const mid = quadPoint(a, edge.c, b, 0.5)

  // each loose end hangs from its node and droops under its own weight
  const dangle = (from: string) => {
    const step = { edge, from, to: from === edge.a ? edge.b : edge.a }
    const start = nodePos(from)
    const bend = stepPoint(step, 0.2)
    const tip = stepPoint(step, 0.38)
    return `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${bend.x.toFixed(1)},${(bend.y + 6).toFixed(1)} ${tip.x.toFixed(1)},${(tip.y + 18).toFixed(1)}`
  }

  return (
    <g fill="none">
      <path d={dangle(edge.a)} className="thread-dangle" style={{ transformOrigin: `${a.x}px ${a.y}px` }} />
      <path
        d={dangle(edge.b)}
        className="thread-dangle"
        style={{ transformOrigin: `${b.x}px ${b.y}px`, animationDelay: '-1.3s' }}
      />
      {!repairing && <circle cx={mid.x} cy={mid.y} r={3} className="break-marker" />}
      <circle cx={mid.x} cy={mid.y} r={5} className="break-burst" />
      <path
        ref={freshRef}
        d={edge.d}
        pathLength={1}
        strokeWidth={1.8}
        strokeLinecap="round"
        style={{ stroke: '#fff0f0', strokeDasharray: '0 3', opacity: 0.75 }}
      />
    </g>
  )
}
