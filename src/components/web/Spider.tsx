import { useEffect, useRef, type RefObject } from 'react'
import type { Lot } from '../../data/lots'
import { hasLivePerk } from '../../data/lore'
import {
  HUB_ID,
  WEB,
  findPath,
  lotNodeId,
  nodePos,
  pathLength,
  stepHeading,
  stepPoint,
  type Edge,
  type Step,
} from '../../sim/geometry'
import { angleDiff, clamp01, showSlice, smoothstep, type SimShared } from '../../sim/shared'

// sprite sheet built from public/sprites/spider.gif by scripts/build_spider_sheet.py
const SPRITE_URL = '/sprites/spider-sheet.png'
const SPRITE_FRAMES = 25
// the sprite's head points down (+y), so a heading of +90° needs no rotation
const SPRITE_HEADING = Math.PI / 2

const WALK_SPEED = 120 // viewBox units / s at full stride
const REPAIR_SPEED = 30
const TURN_RATE = 4.2 // rad / s when turning in place
/** below this the spider turns while walking; above it (near-reversal) it stops and turns */
const SHARP_TURN = 2.1
const ACCEL_DIST = 45
const DECEL_DIST = 60
const CORNER_DIST = 26

type Mode = 'rest' | 'turn' | 'walk' | 'repair' | 'anchor'
type Purpose = 'patrol' | 'home' | 'wander' | 'repair' | 'celebrate' | null

export interface SpiderCallbacks {
  onArrive: (nodeId: string, purpose: Exclude<Purpose, 'repair' | 'celebrate' | null>) => void
  onHeadToRepair: (edge: Edge) => void
  onRepairStart: (edge: Edge) => void
  onRepairDone: (edge: Edge) => void
  onCelebrate: (nodeId: string) => void
}

interface Brain {
  mode: Mode
  until: number
  node: string
  step: Step | null
  t: number
  path: Step[]
  /** full length of the current route and how much of it is behind us */
  routeLength: number
  travelled: number
  /** how sharply the route bends at the node we just left / are heading to (0..π) */
  turnIn: number
  turnOut: number
  purpose: Purpose
  afterTurn: 'walk' | 'repair'
  heading: number
  x: number
  y: number
  pace: number
  nextAnchor: number
}

const STATUS_WEIGHT: Record<Lot['status'], number> = { whisper: 4, active: 3, claimed: 1.6, available: 1 }

function pickWeighted<T>(items: T[], weight: (item: T) => number): T | null {
  const total = items.reduce((s, i) => s + weight(i), 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= weight(item)
    if (r <= 0) return item
  }
  return items[items.length - 1] ?? null
}

function bend(a: Step, b: Step): number {
  return Math.abs(angleDiff(stepHeading(b, 0), stepHeading(a, 1)))
}

interface SpiderProps {
  simRef: RefObject<SimShared>
  lotsRef: RefObject<Lot[]>
  callbacksRef: RefObject<SpiderCallbacks>
}

export default function Spider({ simRef, lotsRef, callbacksRef }: SpiderProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const spriteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const body = bodyRef.current!
    const sprite = spriteRef.current!
    const sim = simRef.current
    const hub = nodePos(HUB_ID)
    const b: Brain = {
      mode: 'rest',
      until: performance.now() + 1500,
      node: HUB_ID,
      step: null,
      t: 0,
      path: [],
      routeLength: 0,
      travelled: 0,
      turnIn: 0,
      turnOut: 0,
      purpose: null,
      afterTurn: 'walk',
      heading: SPRITE_HEADING,
      x: hub.x,
      y: hub.y,
      pace: 1,
      nextAnchor: 0,
    }
    let walking = false
    let raf = 0
    let last = performance.now()

    const releaseEdge = () => {
      if (b.step) sim.busyEdges.delete(b.step.edge.id)
    }

    function setRoute(path: Step[]) {
      b.path = path
      b.routeLength = pathLength(path)
      b.travelled = 0
      b.turnIn = 0
    }

    function plan(now: number) {
      b.pace = 0.9 + Math.random() * 0.3
      const broken = sim.broken

      if (sim.celebrateTarget && !sim.repairing) {
        setRoute(findPath(b.node, sim.celebrateTarget, broken?.id ?? null) ?? [])
        b.purpose = 'celebrate'
        nextStep(now)
        return
      }

      if (broken && !sim.repairing) {
        const toA = findPath(b.node, broken.a, broken.id)
        const toB = findPath(b.node, broken.b, broken.id)
        const len = (p: Step[] | null) => (p ? pathLength(p) : Infinity)
        setRoute((len(toA) <= len(toB) ? toA : toB) ?? [])
        if (b.purpose !== 'repair') callbacksRef.current.onHeadToRepair(broken)
        b.purpose = 'repair'
        nextStep(now)
        return
      }

      const atHub = b.node === HUB_ID
      const roll = Math.random()
      if (!atHub && roll < 0.4) {
        b.purpose = 'home'
        setRoute(findPath(b.node, HUB_ID, broken?.id ?? null) ?? [])
      } else if (roll < (atHub ? 0.72 : 0.8)) {
        b.purpose = 'patrol'
        const here = nodePos(b.node)
        const candidates = lotsRef.current.filter((l) => lotNodeId(l) !== b.node)
        const target = pickWeighted(candidates, (l) => {
          const p = nodePos(lotNodeId(l))
          const beacon = hasLivePerk(l, 'BEACON') ? 3 : 1
          return (beacon * STATUS_WEIGHT[l.status]) / (1 + Math.hypot(p.x - here.x, p.y - here.y) / 350)
        })
        setRoute((target && findPath(b.node, lotNodeId(target), broken?.id ?? null)) || [])
      } else {
        b.purpose = 'wander'
        const route: Step[] = []
        let at = b.node
        let prev: string | null = null
        const hops = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < hops; i++) {
          const opts = WEB.adjacency.get(at)!.filter((s) => s.to !== prev && s.edge.id !== broken?.id)
          const s = opts[Math.floor(Math.random() * opts.length)]
          if (!s) break
          route.push(s)
          prev = at
          at = s.to
        }
        setRoute(route)
      }
      nextStep(now)
    }

    function nextStep(now: number) {
      const previous = b.step
      releaseEdge()
      if (sim.broken && b.purpose !== 'repair' && b.purpose !== 'celebrate' && !sim.repairing) {
        plan(now)
        return
      }
      const step = b.path.shift()
      if (!step) {
        arrived(now)
        return
      }
      if (sim.broken && step.edge.id === sim.broken.id) {
        plan(now)
        return
      }
      b.step = step
      b.t = 0
      b.turnIn = previous ? bend(previous, step) : 0
      b.turnOut = b.path[0] ? bend(step, b.path[0]) : 0
      sim.busyEdges.add(step.edge.id)

      // mid-route corners are taken on the move; only a standing start or a
      // near-reversal makes the spider stop and turn in place
      const diff = Math.abs(angleDiff(stepHeading(step, 0), b.heading))
      const standing = b.mode !== 'walk'
      b.afterTurn = 'walk'
      b.mode = (standing && diff > 0.35) || diff > SHARP_TURN ? 'turn' : 'walk'
    }

    function arrived(now: number) {
      b.step = null
      if (b.purpose === 'repair') {
        startRepair(now)
        return
      }
      if (b.purpose === 'celebrate') {
        sim.celebrateTarget = null
        callbacksRef.current.onCelebrate(b.node)
        b.mode = 'rest'
        b.until = now + 2200 + Math.random() * 800
        b.purpose = null
        return
      }
      if (b.purpose) callbacksRef.current.onArrive(b.node, b.purpose)
      b.mode = 'rest'
      b.until = now + (b.purpose === 'home' ? 3000 + Math.random() * 4500 : 1400 + Math.random() * 3200)
      b.purpose = null
    }

    function startRepair(now: number) {
      const edge = sim.broken
      if (!edge || (b.node !== edge.a && b.node !== edge.b)) {
        b.purpose = null
        plan(now)
        return
      }
      b.step = { edge, from: b.node, to: b.node === edge.a ? edge.b : edge.a }
      b.t = 0
      b.nextAnchor = 0.22 + Math.random() * 0.1
      sim.repairing = true
      sim.busyEdges.add(edge.id)
      callbacksRef.current.onRepairStart(edge)
      b.afterTurn = 'repair'
      b.mode = 'turn'
    }

    function drawRepair(t: number) {
      const step = b.step
      if (!step) return
      const forward = step.from === step.edge.a
      // map "progress from the spider's start" onto the edge's own a→b parameter
      const slice = (from: number, to: number): [number, number] => (forward ? [from, to] : [1 - to, 1 - from])
      const [s0, s1] = slice(0, t)
      sim.repairEls.forEach((el) => showSlice(el, s0, s1))
      if (sim.freshEl) {
        // the bright fresh tip shrinks to nothing as the thread closes, so the
        // finished silk is indistinguishable from the rest of the web
        const tip = 0.16 * (1 - smoothstep(0.75, 1, t))
        const [f0, f1] = slice(Math.max(0, t - tip), t)
        showSlice(sim.freshEl, f0, f1)
      }
    }

    function walkSpeed(): number {
      const step = b.step!
      const len = step.edge.length
      const done = b.travelled + b.t * len
      const left = b.routeLength - done
      const start = 0.3 + 0.7 * smoothstep(0, ACCEL_DIST, done)
      const stop = 0.22 + 0.78 * smoothstep(0, DECEL_DIST, left)
      // ease off before a bend and pick up again after it, proportional to its sharpness
      const cornerOut = 1 - (0.5 * b.turnOut) / Math.PI
      const cornerIn = 1 - (0.5 * b.turnIn) / Math.PI
      const beforeBend = cornerOut + (1 - cornerOut) * clamp01(((1 - b.t) * len) / CORNER_DIST)
      const afterBend = cornerIn + (1 - cornerIn) * clamp01((b.t * len) / CORNER_DIST)
      return WALK_SPEED * b.pace * Math.min(start, stop, beforeBend, afterBend)
    }

    function moveAlong(dt: number, speed: number, turnRate: number) {
      const step = b.step!
      b.t = Math.min(1, b.t + (speed * dt) / step.edge.length)
      const p = stepPoint(step, b.t)
      b.x = p.x
      b.y = p.y
      b.heading += angleDiff(stepHeading(step, b.t), b.heading) * Math.min(1, dt * turnRate)
    }

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      switch (b.mode) {
        case 'rest':
          if (now >= b.until) plan(now)
          break
        case 'anchor':
          if (now >= b.until) b.mode = 'repair'
          break
        case 'turn': {
          const diff = angleDiff(stepHeading(b.step!, 0), b.heading)
          const max = TURN_RATE * dt
          if (Math.abs(diff) <= max) {
            b.heading += diff
            b.mode = b.afterTurn
          } else {
            b.heading += Math.sign(diff) * max
          }
          break
        }
        case 'walk': {
          moveAlong(dt, walkSpeed(), 9)
          if (b.t >= 1) {
            b.travelled += b.step!.edge.length
            b.node = b.step!.to
            nextStep(now)
          }
          break
        }
        case 'repair': {
          moveAlong(dt, REPAIR_SPEED, 12)
          drawRepair(b.t)
          if (b.t >= 1) {
            const edge = b.step!.edge
            releaseEdge()
            b.node = b.step!.to
            b.step = null
            b.purpose = null
            sim.repairing = false
            callbacksRef.current.onRepairDone(edge)
            b.mode = 'rest'
            b.until = now + 1800 + Math.random() * 1500
          } else if (b.t >= b.nextAnchor) {
            // pause to fasten the new silk to the thread
            b.mode = 'anchor'
            b.until = now + 350 + Math.random() * 400
            b.nextAnchor += 0.22 + Math.random() * 0.1
          }
          break
        }
      }

      const moving = b.mode === 'turn' || b.mode === 'walk' || b.mode === 'repair'
      if (moving !== walking) {
        walking = moving
        sprite.classList.toggle('is-walking', moving)
      }
      if (moving) sprite.style.animationDuration = b.mode === 'repair' ? '2.4s' : '1.3s'

      body.style.left = `${b.x / 10}%`
      body.style.top = `${b.y / 10}%`
      body.style.transform = `translate(-50%, -50%) rotate(${((b.heading - SPRITE_HEADING) * 180) / Math.PI}deg)`

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      releaseEdge()
    }
  }, [simRef, lotsRef, callbacksRef])

  return (
    <div
      ref={bodyRef}
      className="pointer-events-none absolute z-20"
      style={{
        width: 'max(6.4%, 34px)',
        aspectRatio: '1',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        willChange: 'transform',
      }}
    >
      <div
        ref={spriteRef}
        data-arachne=""
        className="spider-sprite h-full w-full"
        style={{
          backgroundImage: `url(${SPRITE_URL})`,
          backgroundSize: `${SPRITE_FRAMES * 100}% 100%`,
        }}
      />
    </div>
  )
}
