import type { LotRow, LotStatus } from './types.ts'

// Mirrors src/data/lots.ts on the client so the first boot of a fresh
// database looks identical to the old client-only simulation. Seed flavor
// text is always English — only real user input (rename/whisper) is
// language-neutral free text, so there is nothing to translate here.
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

const CUSTOM_NAMES = ['NULL-THREAD', 'RED NODE', 'QUIET VOICE', 'WARDEN', 'ECHO', 'COBWEB', 'VENOM', 'TRAP-7']
const SEED_WHISPERS = ['wait', 'listen north', 'the thread remembers', 'red is a signal']

export function buildSeedLots(): LotRow[] {
  const lots: LotRow[] = []
  let id = 1
  for (let ring = 1; ring <= RING_COUNT; ring++) {
    for (let ray = 1; ray <= RAY_COUNT; ray++) {
      const seed = ring * 37 + ray * 13 + id * 7
      const status = pickStatus(seed)
      lots.push({
        id,
        ring,
        ray,
        status,
        ownerAddress: status === 'available' ? null : fakeAddress(seed),
        customName: status === 'available' ? null : CUSTOM_NAMES[seed % CUSTOM_NAMES.length],
        whisper: status === 'whisper' ? SEED_WHISPERS[seed % SEED_WHISPERS.length] : null,
        priceUsd: 5 + ring * 3,
      })
      id++
    }
  }
  return lots
}
