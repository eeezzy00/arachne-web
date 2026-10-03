import type { Lang } from '../state/LanguageContext'
import { describeRole } from './roles'

export type LotStatus = 'available' | 'claimed' | 'active' | 'whisper'

export interface Lot {
  id: number
  ring: number // 1-6, 1 = closest to spider
  ray: number // 1-12
  status: LotStatus
  customName: string | null
  ownerAddress: string | null
  whisper: string | null
  priceUsd: number
  role: string
  roleDescription: string
}

export const RING_COUNT = 6
export const RAY_COUNT = 12

function fakeAddress(seed: number): string {
  const hex = ((seed * 2654435761) >>> 0).toString(16).padStart(8, '0')
  return `0x${hex.repeat(5)}`
}

function pickStatus(seed: number): LotStatus {
  const r = seed % 100
  if (r < 55) return 'available'
  if (r < 75) return 'claimed'
  if (r < 90) return 'active'
  return 'whisper'
}

const CUSTOM_NAMES: Record<Lang, string[]> = {
  en: ['NULL-THREAD', 'RED NODE', 'QUIET VOICE', 'WARDEN', 'ECHO', 'COBWEB', 'VENOM', 'TRAP-7'],
  ru: ['НИТЬ-НОЛЬ', 'КРАСНЫЙ УЗЕЛ', 'ТИХИЙ ГОЛОС', 'СТРАЖ', 'ЭХО', 'ПАУТИНКА', 'ЯД', 'ЛОВУШКА-7'],
}

const SEED_WHISPERS: Record<Lang, string[]> = {
  en: ['wait', 'listen north', 'the thread remembers', 'red is a signal'],
  ru: ['ждать', 'слушай север', 'нить помнит', 'красный — это сигнал'],
}

export function generateLots(lang: Lang): Lot[] {
  const lots: Lot[] = []
  const names = CUSTOM_NAMES[lang]
  const whispers = SEED_WHISPERS[lang]
  let id = 1
  for (let ring = 1; ring <= RING_COUNT; ring++) {
    for (let ray = 1; ray <= RAY_COUNT; ray++) {
      const seed = ring * 37 + ray * 13 + id * 7
      const status = pickStatus(seed)
      const { role, description } = describeRole(ring, ray, id, lang)
      lots.push({
        id,
        ring,
        ray,
        status,
        customName: status === 'available' ? null : names[seed % names.length],
        ownerAddress: status === 'available' ? null : fakeAddress(seed),
        whisper: status === 'whisper' ? whispers[seed % whispers.length] : null,
        priceUsd: 5 + ring * 3,
        role,
        roleDescription: description,
      })
      id++
    }
  }
  return lots
}

export function formatLotId(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}
