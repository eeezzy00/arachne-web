import type { Edge } from './geometry'

/**
 * Mutable state shared by the per-frame loops (spider, energy flows) and the
 * scene. Kept in a ref so 60fps updates never trigger React renders.
 */
export interface SimShared {
  broken: Edge | null
  repairing: boolean
  /** copies of the torn thread in every thread layer, revealed as the spider re-spins it */
  repairEls: Set<SVGPathElement>
  /** short brighter segment right behind the spider while it spins */
  freshEl: SVGPathElement | null
  /** edges currently occupied — a thread under someone's feet never snaps */
  busyEdges: Set<string>
  /** a just-bought node the spider should visit next, ahead of its usual patrol */
  celebrateTarget: string | null
}

export function createSimShared(): SimShared {
  return {
    broken: null,
    repairing: false,
    repairEls: new Set(),
    freshEl: null,
    busyEdges: new Set(),
    celebrateTarget: null,
  }
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Shortest signed difference between two angles, in radians. */
export function angleDiff(target: number, current: number): number {
  let d = target - current
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** Shows the [from, to] slice (0..1 of the edge's own a→b direction) of a pathLength=1 path. */
export function showSlice(el: SVGPathElement, from: number, to: number): void {
  el.style.strokeDasharray = `${Math.max(0, to - from)} 3`
  el.style.strokeDashoffset = String(-from)
}
