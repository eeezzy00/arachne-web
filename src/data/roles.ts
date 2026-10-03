// Every lot plays a functional role in the "stack" of the web.
// Ring = layer of the stack (closer to the spider = deeper/core layer).
// Ray = which role archetype the node plays within that layer.
// Ids are stable English identifiers used as dictionary keys everywhere
// else in the app; only the display name/description are bilingual.

import type { Lang } from '../state/LanguageContext'

export type LayerId = 'CORE' | 'MEMORY' | 'ROUTING' | 'VALIDATION' | 'INTERFACE' | 'PERIPHERY'
export type RoleId =
  | 'RELAY'
  | 'CACHE'
  | 'SENSOR'
  | 'BRIDGE'
  | 'GUARD'
  | 'MIRROR'
  | 'BUFFER'
  | 'BEACON'
  | 'TRAP'
  | 'ANALYZER'
  | 'VAULT'
  | 'CIPHER'

interface Localized {
  en: string
  ru: string
}

export interface StackLayer {
  id: LayerId
  ring: number
  name: Localized
  description: Localized
}

export const STACK_LAYERS: StackLayer[] = [
  { id: 'CORE', ring: 1, name: { en: 'CORE', ru: 'ЯДРО' }, description: { en: 'inner layer, closest to the spider', ru: 'внутренний слой, ближайший к пауку' } },
  { id: 'MEMORY', ring: 2, name: { en: 'MEMORY', ru: 'ПАМЯТЬ' }, description: { en: 'state and history storage layer', ru: 'слой хранения состояний и истории' } },
  { id: 'ROUTING', ring: 3, name: { en: 'ROUTING', ru: 'МАРШРУТИЗАЦИЯ' }, description: { en: 'signal routing layer between nodes', ru: 'слой передачи сигналов между узлами' } },
  { id: 'VALIDATION', ring: 4, name: { en: 'VALIDATION', ru: 'ВАЛИДАЦИЯ' }, description: { en: 'incoming data validation and filtering layer', ru: 'слой проверки и фильтрации входящих данных' } },
  { id: 'INTERFACE', ring: 5, name: { en: 'INTERFACE', ru: 'ИНТЕРФЕЙС' }, description: { en: 'layer linking the network to its owners', ru: 'слой связи между сетью и владельцами' } },
  { id: 'PERIPHERY', ring: 6, name: { en: 'PERIPHERY', ru: 'ПЕРИФЕРИЯ' }, description: { en: 'outer layer, first to receive vibrations', ru: 'внешний слой, первым принимающий вибрации' } },
]

export interface RoleArchetype {
  id: RoleId
  name: Localized
  verb: Localized
}

export const ROLE_ARCHETYPES: RoleArchetype[] = [
  { id: 'RELAY', name: { en: 'RELAY', ru: 'РЕЛЕ' }, verb: { en: 'relays signals between neighboring nodes without distortion', ru: 'передаёт сигнал между соседними узлами без искажений' } },
  { id: 'CACHE', name: { en: 'CACHE', ru: 'КЭШ' }, verb: { en: "stores the network's recent vibrations for fast access", ru: 'хранит последние вибрации сети для быстрого доступа' } },
  { id: 'SENSOR', name: { en: 'SENSOR', ru: 'СЕНСОР' }, verb: { en: 'detects thread vibrations and relays them to the spider', ru: 'фиксирует колебания нити и передаёт их пауку' } },
  { id: 'BRIDGE', name: { en: 'BRIDGE', ru: 'МОСТ' }, verb: { en: 'connects two rings, syncing their state', ru: 'соединяет два кольца, синхронизируя их состояния' } },
  { id: 'GUARD', name: { en: 'GUARD', ru: 'СТРАЖ' }, verb: { en: 'checks incoming whispers before they reach the core', ru: 'проверяет входящие шёпоты перед тем как впустить их в ядро' } },
  { id: 'MIRROR', name: { en: 'MIRROR', ru: 'ЗЕРКАЛО' }, verb: { en: "duplicates a neighboring node's state for redundancy", ru: 'дублирует состояние соседнего узла для отказоустойчивости' } },
  { id: 'BUFFER', name: { en: 'BUFFER', ru: 'БУФЕР' }, verb: { en: 'queues whispers before the agent processes them', ru: 'накапливает шёпоты перед тем как агент их обработает' } },
  { id: 'BEACON', name: { en: 'BEACON', ru: 'МАЯК' }, verb: { en: 'signals the spider that this sector has activity', ru: 'подаёт сигнал пауку о том, что в секторе есть активность' } },
  { id: 'TRAP', name: { en: 'TRAP', ru: 'ЛОВУШКА' }, verb: { en: 'lures the spider to check this sector more often', ru: 'приманивает паука чаще проверять этот сектор паутины' } },
  { id: 'ANALYZER', name: { en: 'ANALYZER', ru: 'АНАЛИЗАТОР' }, verb: { en: 'parses incoming data into patterns', ru: 'разбирает входящие данные на паттерны' } },
  { id: 'VAULT', name: { en: 'VAULT', ru: 'ХРАНИЛИЩЕ' }, verb: { en: "keeps an archive of the node's past whispers", ru: 'держит архив всех прошлых шёпотов узла' } },
  { id: 'CIPHER', name: { en: 'CIPHER', ru: 'ШИФР' }, verb: { en: 'encrypts the private log before showing it to owners', ru: 'шифрует приватный лог перед показом владельцам' } },
]

export function getStackLayer(ring: number): StackLayer {
  return STACK_LAYERS[(ring - 1) % STACK_LAYERS.length]
}

export function getRoleArchetype(ray: number): RoleArchetype {
  return ROLE_ARCHETYPES[(ray - 1) % ROLE_ARCHETYPES.length]
}

export function describeRole(ring: number, ray: number, id: number, lang: Lang): { role: string; description: string } {
  const layer = getStackLayer(ring)
  const archetype = getRoleArchetype(ray)
  const nodeWord = lang === 'ru' ? 'Узел' : 'Node'
  const layerWord = lang === 'ru' ? 'на уровне' : 'at the'
  return {
    role: `${archetype.name[lang]} · ${layer.name[lang]}`,
    description:
      lang === 'ru'
        ? `${nodeWord} #${String(id).padStart(3, '0')} — ${archetype.verb.ru}. Работает ${layerWord} «${layer.name.ru}» (${layer.description.ru}).`
        : `${nodeWord} #${String(id).padStart(3, '0')} — ${archetype.verb.en}. Runs ${layerWord} "${layer.name.en}" layer (${layer.description.en}).`,
  }
}
