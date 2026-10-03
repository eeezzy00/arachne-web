import { useEffect, useId, useRef, type RefObject } from 'react'
import { HUB_ID, WEB, nodePos, stepPoint, type Step } from '../../sim/geometry'
import { clamp01, easeInOut, showSlice, type SimShared } from '../../sim/shared'

const HALF = 10 // tank half-size in viewBox units
const TAIL = 0.5 // length of the flowing red stream, as a fraction of the thread

interface FlowAgentProps {
  simRef: RefObject<SimShared>
  /** varies timing so several agents never move in lockstep */
  seed: number
}

interface Tank {
  g: SVGGElement
  base: SVGRectElement
  back: SVGPathElement
  front: SVGPathElement
  level: number
  slosh: number
}

/** Closed path of a liquid body whose surface is a travelling sine wave. */
function wavePath(level: number, amp: number, phase: number, lift = 0): string {
  const surface = HALF - 2 * HALF * level + lift
  let d = `M${-HALF - 1},${HALF + 1} L${-HALF - 1},${surface.toFixed(2)}`
  for (let x = -HALF; x <= HALF + 0.01; x += 1.6) {
    d += ` L${x.toFixed(2)},${(surface + amp * Math.sin(x * 0.55 + phase)).toFixed(2)}`
  }
  return `${d} L${HALF + 1},${HALF + 1} Z`
}

/**
 * A charge of red light: a node fills with water from the bottom up, then
 * the red drains out and streams along the thread into a neighbouring
 * node, which starts filling in turn.
 */
export default function FlowAgent({ simRef, seed }: FlowAgentProps) {
  const uid = useId().replace(/:/g, '')
  const glowRef = useRef<SVGPathElement>(null)
  const coreRef = useRef<SVGPathElement>(null)
  const headRef = useRef<SVGCircleElement>(null)
  const tankRefs = useRef<(SVGGElement | null)[]>([null, null])

  useEffect(() => {
    const sim = simRef.current
    const glow = glowRef.current!
    const core = coreRef.current!
    const head = headRef.current!
    const tanks: Tank[] = tankRefs.current.map((el) => {
      const g = el!
      return {
        g,
        base: g.querySelector('[data-base]')!,
        back: g.querySelector('[data-back]')!,
        front: g.querySelector('[data-front]')!,
        level: 0,
        slosh: 0,
      }
    })
    const fillMs = 1700 + seed * 260
    const speed = 150 + seed * 30

    const place = (tank: Tank, id: string) => {
      const p = nodePos(id)
      tank.g.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`)
    }
    const showStream = (on: boolean) => {
      glow.setAttribute('opacity', on ? '0.28' : '0')
      core.setAttribute('opacity', on ? '1' : '0')
      head.setAttribute('opacity', on ? '1' : '0')
    }
    const drawTank = (tank: Tank, time: number) => {
      const calm = 1 - tank.level * 0.55
      const amp = (0.9 + tank.slosh * 2.6) * calm
      const phase = time * 5 + seed
      tank.front.setAttribute('d', wavePath(tank.level, amp, phase))
      tank.back.setAttribute('d', wavePath(tank.level, amp * 0.8, -phase * 0.8 + 2, -0.9))
    }

    const ids = [...WEB.nodes.keys()].filter((id) => id !== HUB_ID)
    let cur = ids[Math.floor(Math.random() * ids.length)]
    let prev: string | null = null
    let step: Step | null = null
    let slot = 0
    let phase: 'fill' | 'flow' = 'fill'
    let t = -seed * 0.4 // stagger the first fill

    place(tanks[0], cur)
    tanks[0].g.setAttribute('opacity', '1')
    tanks[0].slosh = 1
    tanks[1].g.setAttribute('opacity', '0')
    showStream(false)

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const time = now / 1000
      const src = tanks[slot]
      const dst = tanks[1 - slot]

      if (phase === 'fill') {
        t += (dt * 1000) / fillMs
        src.level = easeInOut(clamp01(t))
        src.slosh = Math.max(0, src.slosh - dt * 0.9)
        if (t >= 1) {
          const blocked = sim.broken?.id
          const options = WEB.adjacency.get(cur)!.filter((s) => s.to !== HUB_ID && s.edge.id !== blocked)
          const fresh = options.filter((s) => s.to !== prev)
          const pool = fresh.length > 0 ? fresh : options
          if (pool.length === 0) {
            t = 0
          } else {
            step = pool[Math.floor(Math.random() * pool.length)]
            sim.busyEdges.add(step.edge.id)
            glow.setAttribute('d', step.edge.d)
            core.setAttribute('d', step.edge.d)
            place(dst, step.to)
            dst.level = 0
            dst.slosh = 0
            dst.base.setAttribute('opacity', '1')
            dst.g.setAttribute('opacity', '0')
            showStream(true)
            phase = 'flow'
            t = 0
          }
        }
      } else if (step) {
        t += (speed * dt) / step.edge.length
        const forward = step.from === step.edge.a
        const start = clamp01(t - TAIL)
        const end = clamp01(t)
        const [s0, s1] = forward ? [start, end] : [1 - end, 1 - start]
        showSlice(glow, s0, s1)
        showSlice(core, s0, s1)

        if (t <= 1) {
          const p = stepPoint(step, t)
          head.setAttribute('cx', p.x.toFixed(1))
          head.setAttribute('cy', p.y.toFixed(1))
        } else {
          head.setAttribute('opacity', '0')
        }

        // the red drains out of the source first, then its water evaporates...
        src.base.setAttribute('opacity', (1 - clamp01(t / 0.35)).toFixed(3))
        src.g.setAttribute('opacity', (1 - clamp01((t - 0.25) / 0.7)).toFixed(3))
        // ...while the stream pools into the destination and makes it slosh
        dst.g.setAttribute('opacity', clamp01((t - 0.85) / 0.3).toFixed(3))
        if (t > 1 && dst.slosh === 0) dst.slosh = 1

        if (t >= 1 + TAIL) {
          sim.busyEdges.delete(step.edge.id)
          showStream(false)
          prev = cur
          cur = step.to
          step = null
          slot = 1 - slot
          phase = 'fill'
          t = 0
        }
      }

      drawTank(src, time)
      if (phase === 'flow') drawTank(dst, time)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (step) sim.busyEdges.delete(step.edge.id)
    }
  }, [simRef, seed])

  const tank = (i: number) => {
    const clip = `tank-${uid}-${i}`
    return (
      <g
        ref={(el) => {
          tankRefs.current[i] = el
        }}
        opacity={0}
      >
        <clipPath id={clip}>
          <rect x={-HALF} y={-HALF} width={HALF * 2} height={HALF * 2} />
        </clipPath>
        <circle r={HALF * 2.4} fill="url(#node-glow-red)" />
        <rect
          data-base=""
          x={-HALF}
          y={-HALF}
          width={HALF * 2}
          height={HALF * 2}
          shapeRendering="crispEdges"
          style={{ fill: 'var(--eye)' }}
        />
        <g clipPath={`url(#${clip})`}>
          <path data-back="" fill="#ffd9d9" opacity={0.55} />
          <path data-front="" fill="#f4f8ff" opacity={0.93} />
          <rect x={-HALF + 2} y={-HALF + 2} width={2} height={5} fill="#ffffff" opacity={0.35} />
        </g>
        <rect
          x={-HALF}
          y={-HALF}
          width={HALF * 2}
          height={HALF * 2}
          fill="none"
          strokeWidth={1.2}
          shapeRendering="crispEdges"
          style={{ stroke: 'var(--eye-glow)' }}
        />
      </g>
    )
  }

  return (
    <g pointerEvents="none">
      <path
        ref={glowRef}
        fill="none"
        strokeWidth={8}
        strokeLinecap="round"
        pathLength={1}
        opacity={0}
        style={{ stroke: 'var(--eye-glow)' }}
      />
      <path ref={coreRef} fill="none" stroke="#ff5a5a" strokeWidth={2} strokeLinecap="round" pathLength={1} opacity={0} />
      <circle ref={headRef} r={2.6} fill="#ffe0e0" opacity={0} />
      {tank(0)}
      {tank(1)}
    </g>
  )
}
