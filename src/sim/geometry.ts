import { RAY_COUNT, RING_COUNT, type Lot } from '../data/lots'

export const SIZE = 1000
export const CENTER = SIZE / 2
export const MAX_R = 440
export const HUB_ID = 'hub'

export interface Point {
  x: number
  y: number
}

export interface GNode extends Point {
  id: string
  ring: number // 0 = hub
  ray: number
}

export interface Edge {
  id: string
  a: string
  b: string
  kind: 'ring' | 'spoke'
  /** quadratic bezier control point — ring threads sag toward the hub */
  c: Point
  d: string
  length: number
}

export interface Step {
  edge: Edge
  from: string
  to: string
}

export interface WebGraph {
  nodes: Map<string, GNode>
  edges: Edge[]
  adjacency: Map<string, Step[]>
}

export function nodeId(ring: number, ray: number): string {
  return `${ring}-${ray}`
}

export function lotNodeId(lot: Pick<Lot, 'ring' | 'ray'>): string {
  return nodeId(lot.ring, lot.ray)
}

// deterministic noise so the web looks hand-spun but identical on every load
function noise(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export function rayAngle(ray: number): number {
  const base = (ray / RAY_COUNT) * Math.PI * 2 - Math.PI / 2
  return base + (noise(ray) - 0.5) * 0.12
}

export function ringRadius(ring: number, ray: number): number {
  const base = (ring / RING_COUNT) * MAX_R
  return base * (1 + (noise(ring * 31 + ray * 7) - 0.5) * 0.07)
}

export function quadPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  }
}

function quadTangent(a: Point, c: Point, b: Point, t: number): Point {
  return {
    x: 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x),
    y: 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y),
  }
}

function quadLength(a: Point, c: Point, b: Point): number {
  let len = 0
  let prev = a
  for (let i = 1; i <= 20; i++) {
    const p = quadPoint(a, c, b, i / 20)
    len += Math.hypot(p.x - prev.x, p.y - prev.y)
    prev = p
  }
  return len
}

/** Control point for a thread between two points, sagging toward `anchor`. */
export function sagControl(a: Point, b: Point, anchor: Point, sag: number): Point {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return { x: mid.x + (anchor.x - mid.x) * sag, y: mid.y + (anchor.y - mid.y) * sag }
}

function makeEdge(kind: Edge['kind'], a: GNode, b: GNode): Edge {
  const hub = { x: CENTER, y: CENTER }
  const c =
    kind === 'ring' ? sagControl(a, b, hub, 0.1) : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return {
    id: `${a.id}|${b.id}`,
    a: a.id,
    b: b.id,
    kind,
    c,
    d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
    length: quadLength(a, c, b),
  }
}

function buildGraph(): WebGraph {
  const nodes = new Map<string, GNode>()
  const edges: Edge[] = []
  const adjacency = new Map<string, Step[]>()

  nodes.set(HUB_ID, { id: HUB_ID, ring: 0, ray: 0, x: CENTER, y: CENTER })
  for (let ring = 1; ring <= RING_COUNT; ring++) {
    for (let ray = 1; ray <= RAY_COUNT; ray++) {
      const r = ringRadius(ring, ray)
      const angle = rayAngle(ray)
      const id = nodeId(ring, ray)
      nodes.set(id, { id, ring, ray, x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) })
    }
  }

  const get = (id: string) => nodes.get(id)!
  for (let ray = 1; ray <= RAY_COUNT; ray++) {
    edges.push(makeEdge('spoke', get(HUB_ID), get(nodeId(1, ray))))
    for (let ring = 1; ring <= RING_COUNT; ring++) {
      if (ring < RING_COUNT) edges.push(makeEdge('spoke', get(nodeId(ring, ray)), get(nodeId(ring + 1, ray))))
      edges.push(makeEdge('ring', get(nodeId(ring, ray)), get(nodeId(ring, (ray % RAY_COUNT) + 1))))
    }
  }

  for (const id of nodes.keys()) adjacency.set(id, [])
  for (const edge of edges) {
    adjacency.get(edge.a)!.push({ edge, from: edge.a, to: edge.b })
    adjacency.get(edge.b)!.push({ edge, from: edge.b, to: edge.a })
  }

  return { nodes, edges, adjacency }
}

export const WEB = buildGraph()

export function nodePos(id: string): Point {
  return WEB.nodes.get(id)!
}

/** Point at progress t (0..1) walking the step's edge from `step.from`. */
export function stepPoint(step: Step, t: number): Point {
  const { edge } = step
  const a = nodePos(edge.a)
  const b = nodePos(edge.b)
  return quadPoint(a, edge.c, b, step.from === edge.a ? t : 1 - t)
}

/** Direction of travel (radians) at progress t along the step. */
export function stepHeading(step: Step, t: number): number {
  const { edge } = step
  const a = nodePos(edge.a)
  const b = nodePos(edge.b)
  const forward = step.from === edge.a
  const tan = quadTangent(a, edge.c, b, forward ? t : 1 - t)
  return forward ? Math.atan2(tan.y, tan.x) : Math.atan2(-tan.y, -tan.x)
}

/** Dijkstra over thread length; `blockedEdgeId` is a torn thread nobody can walk. */
export function findPath(from: string, to: string, blockedEdgeId: string | null = null): Step[] | null {
  if (from === to) return []
  const dist = new Map<string, number>([[from, 0]])
  const via = new Map<string, Step>()
  const open = new Set<string>([from])
  const done = new Set<string>()

  while (open.size > 0) {
    let current = ''
    let best = Infinity
    for (const id of open) {
      const d = dist.get(id)!
      if (d < best) {
        best = d
        current = id
      }
    }
    if (current === to) break
    open.delete(current)
    done.add(current)

    for (const step of WEB.adjacency.get(current)!) {
      if (step.edge.id === blockedEdgeId || done.has(step.to)) continue
      const nd = best + step.edge.length
      if (nd < (dist.get(step.to) ?? Infinity)) {
        dist.set(step.to, nd)
        via.set(step.to, step)
        open.add(step.to)
      }
    }
  }

  if (!via.has(to)) return null
  const path: Step[] = []
  for (let id = to; id !== from; ) {
    const step = via.get(id)!
    path.unshift(step)
    id = step.from
  }
  return path
}

export function pathLength(path: Step[]): number {
  return path.reduce((sum, s) => sum + s.edge.length, 0)
}

/** Decorative capture-spiral threads between the walkable rings. */
export function spiralThreads(): string[] {
  const out: string[] = []
  const hub = { x: CENTER, y: CENTER }
  for (let ring = 1; ring < RING_COUNT; ring++) {
    for (const f of [0.35, 0.68]) {
      for (let ray = 1; ray <= RAY_COUNT; ray++) {
        const next = (ray % RAY_COUNT) + 1
        const lerp = (r: number) => {
          const p = nodePos(nodeId(ring, r))
          const q = nodePos(nodeId(ring + 1, r))
          return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f }
        }
        const a = lerp(ray)
        const b = lerp(next)
        const c = sagControl(a, b, hub, 0.1)
        out.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`)
      }
    }
  }
  return out
}

/** Frame threads that anchor the outer ring to the edges of the scene. */
export function anchorThreads(): string[] {
  const out: string[] = []
  for (let ray = 1; ray <= RAY_COUNT; ray += 2) {
    const p = nodePos(nodeId(RING_COUNT, ray))
    const angle = rayAngle(ray)
    const reach = MAX_R + 70 + noise(ray * 3) * 40
    out.push(`M${p.x.toFixed(1)},${p.y.toFixed(1)} L${(CENTER + reach * Math.cos(angle)).toFixed(1)},${(CENTER + reach * Math.sin(angle)).toFixed(1)}`)
  }
  return out
}
