import type { Lang } from '../state/LanguageContext'
import { formatLotId, type Lot } from './lots'

export type ArchiveTone = 'normal' | 'alert' | 'dim' | 'good'
export type ArchiveCategory = 'sync' | 'whisper' | 'validate' | 'anomaly' | 'active' | 'silence' | 'slot' | 'system'

export interface ArchiveEntry {
  id: number
  time: string
  text: string
  tone: ArchiveTone
  category: ArchiveCategory
}

let counter = 0

export function makeEntry(text: string, tone: ArchiveTone = 'normal', category: ArchiveCategory = 'system'): ArchiveEntry {
  counter += 1
  return { id: counter, time: new Date().toTimeString().slice(0, 8), text, tone, category }
}

function pickLot(lots: Lot[], predicate?: (lot: Lot) => boolean): Lot | null {
  const pool = predicate ? lots.filter(predicate) : lots
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

/** One synthetic system-log line derived from the current lot state. */
export function randomLogEntry(lots: Lot[], lang: Lang): ArchiveEntry {
  const roll = Math.random()
  const en = lang === 'en'

  if (roll < 0.2) {
    const lot = pickLot(lots) ?? lots[0]
    return makeEntry(
      en
        ? `NODE ${formatLotId(lot.id)} [${lot.ring}-${lot.ray}] SYNCED ... OK`
        : `СИНХРОНИЗАЦИЯ УЗЛА ${formatLotId(lot.id)} [${lot.ring}-${lot.ray}] ... OK`,
      'normal',
      'sync',
    )
  }
  if (roll < 0.35) {
    const lot = pickLot(lots, (l) => l.status === 'whisper' && !!l.whisper)
    return makeEntry(
      lot
        ? en
          ? `WHISPER FROM NODE ${formatLotId(lot.id)}: "${lot.whisper}"`
          : `ШЁПОТ УЗЛА ${formatLotId(lot.id)}: «${lot.whisper}»`
        : en
          ? 'WHISPER QUEUE EMPTY'
          : 'ОЧЕРЕДЬ ШЁПОТОВ ПУСТА',
      'normal',
      'whisper',
    )
  }
  if (roll < 0.5) {
    const ring = 1 + Math.floor(Math.random() * 6)
    return makeEntry(
      en ? `RING ${ring} VALIDATION COMPLETE · 0 ERRORS` : `ВАЛИДАЦИЯ КОЛЬЦА ${ring} ЗАВЕРШЕНА · 0 ОШИБОК`,
      'normal',
      'validate',
    )
  }
  if (roll < 0.62) {
    const ring = 1 + Math.floor(Math.random() * 6)
    const pct = (4 + Math.random() * 20).toFixed(1)
    return makeEntry(
      en ? `ANOMALY: +${pct}% FLUCTUATION IN RING ${ring}` : `АНОМАЛИЯ: КОЛЕБАНИЕ +${pct}% В КОЛЬЦЕ ${ring}`,
      'alert',
      'anomaly',
    )
  }
  if (roll < 0.75) {
    const lot = pickLot(lots, (l) => l.status === 'active')
    return makeEntry(
      lot
        ? en
          ? `NODE ${formatLotId(lot.id)} ("${lot.customName ?? '???'}") HOLDS ACTIVITY`
          : `УЗЕЛ ${formatLotId(lot.id)} («${lot.customName ?? '???'}») СОХРАНЯЕТ АКТИВНОСТЬ`
        : en
          ? 'NO ACTIVE NODES DETECTED'
          : 'АКТИВНЫХ УЗЛОВ НЕ ОБНАРУЖЕНО',
      'normal',
      'active',
    )
  }
  if (roll < 0.88) {
    const ray = 1 + Math.floor(Math.random() * 12)
    const min = 1 + Math.floor(Math.random() * 50)
    return makeEntry(
      en ? `SILENCE IN SECTOR ${ray} — ${min} MIN` : `ТИШИНА В СЕКТОРЕ ${ray} — ${min} МИН`,
      'dim',
      'silence',
    )
  }
  const lot = pickLot(lots, (l) => l.status === 'available')
  return makeEntry(
    lot
      ? en
        ? `SLOT ${formatLotId(lot.id)} [${lot.ring}-${lot.ray}] FREE TO CLAIM`
        : `СЛОТ ${formatLotId(lot.id)} [${lot.ring}-${lot.ray}] СВОБОДЕН ДЛЯ ЗАХВАТА`
      : en
        ? 'ALL SLOTS CLAIMED'
        : 'ВСЕ СЛОТЫ ЗАНЯТЫ',
    'normal',
    'slot',
  )
}
