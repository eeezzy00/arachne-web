import { PATTERN_STAGES, type PatternStage } from '../data/lore'
import type { Lot } from '../data/lots'
import { HUB_ID, WEB, lotNodeId, type Edge } from './geometry'

export interface PatternState {
  ownedNodes: number
  livingThreads: number
  totalNodes: number
  totalThreads: number
  progress: number
  reached: PatternStage | null
  next: PatternStage | null
}

function ownedNodeIds(lots: Lot[]): Set<string> {
  // the hub is Arachne herself — always "held"
  const ids = new Set<string>([HUB_ID])
  for (const lot of lots) if (lot.status !== 'available') ids.add(lotNodeId(lot))
  return ids
}

/** Threads whose both ends are held: they glow and count toward the Pattern. */
export function livingEdges(lots: Lot[]): Edge[] {
  const owned = ownedNodeIds(lots)
  return WEB.edges.filter((e) => owned.has(e.a) && owned.has(e.b))
}

/** Threads whose both ends belong to one address — a personal constellation. */
export function ownerEdges(lots: Lot[], address: string): Edge[] {
  const mine = new Set(lots.filter((l) => l.ownerAddress === address).map(lotNodeId))
  return WEB.edges.filter((e) => mine.has(e.a) && mine.has(e.b))
}

export function computePattern(lots: Lot[]): PatternState {
  const ownedNodes = lots.filter((l) => l.status !== 'available').length
  const livingThreads = livingEdges(lots).length
  const totalNodes = lots.length
  const totalThreads = WEB.edges.length
  const progress = (ownedNodes + livingThreads) / (totalNodes + totalThreads)
  const reached = [...PATTERN_STAGES].reverse().find((s) => progress >= s.threshold) ?? null
  const next = PATTERN_STAGES.find((s) => progress < s.threshold) ?? null
  return { ownedNodes, livingThreads, totalNodes, totalThreads, progress, reached, next }
}
