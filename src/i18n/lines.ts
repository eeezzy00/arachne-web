// Bilingual templates for the archive log and the spider's ambient chat lines.
// Kept separate from the static UI dictionary because every line takes
// arguments (node ids, addresses, thread labels).

import type { Lang } from '../state/LanguageContext'

const API_ERRORS: Record<string, { en: string; ru: string }> = {
  'no such lot': { en: 'That node does not exist', ru: 'Такого узла не существует' },
  'lot already claimed': { en: 'Someone else just claimed this node', ru: 'Узел уже занят кем-то другим' },
  'claim raced — try another lot': { en: 'Too slow — try another node', ru: 'Не успел — попробуй другой узел' },
  'not your lot': { en: 'This node is not yours', ru: 'Этот узел не твой' },
  'invalid recipient address': { en: 'Invalid recipient address', ru: 'Неверный адрес получателя' },
  'whisper cannot be empty': { en: 'A whisper cannot be empty', ru: 'Шёпот не может быть пустым' },
  'missing bearer token': { en: 'You are logged out — log in again', ru: 'Сессия завершена — войди снова' },
  'invalid or expired token': { en: 'Session expired — log in again', ru: 'Сессия истекла — войди снова' },
  'Cannot reach the server': { en: 'Cannot reach the server', ru: 'Не удаётся связаться с сервером' },
  'Log in first': { en: 'Log in first', ru: 'Сначала войди в сеть' },
  'signature does not match the issued challenge': {
    en: 'Signature verification failed — try again',
    ru: 'Не удалось проверить подпись — попробуй снова',
  },
  'invalid address for chain': { en: 'Invalid address for this chain', ru: 'Неверный адрес для этой сети' },
  'chain must be "evm" or "solana"': { en: 'Unsupported chain', ru: 'Неподдерживаемая сеть' },
  'missing signature': { en: 'No signature received from the wallet', ru: 'Кошелёк не вернул подпись' },
}

/** Server/network error messages are plain English — this maps the known ones to the active UI language. */
export function translateApiError(message: string, lang: Lang): string {
  return API_ERRORS[message]?.[lang] ?? message
}

export const lines = {
  nodeClaimed: (lang: Lang, id: string, price: string, role: string) =>
    lang === 'en' ? `NODE ${id} CLAIMED · ${price} · ${role}` : `УЗЕЛ ${id} ПРИОБРЕТЁН · ${price} · ${role}`,
  nicknameChanged: (lang: Lang, from: string, to: string) =>
    lang === 'en' ? `${from} IS NOW KNOWN AS ${to}` : `${from} ТЕПЕРЬ ИЗВЕСТЕН КАК ${to}`,
  nodeRenamed: (lang: Lang, id: string, name: string) =>
    lang === 'en' ? `NODE ${id} RENAMED TO "${name}"` : `УЗЕЛ ${id} ПЕРЕИМЕНОВАН В «${name}»`,
  nodeUnnamed: (lang: Lang, id: string) => (lang === 'en' ? `NODE ${id} LOST ITS NAME` : `УЗЕЛ ${id} ПОТЕРЯЛ ИМЯ`),
  nodeWhispered: (lang: Lang, id: string, text: string) =>
    lang === 'en' ? `NODE ${id} WHISPERED: "${text}"` : `УЗЕЛ ${id} ПРОШЕПТАЛ: «${text}»`,
  nodeTransferred: (lang: Lang, id: string, to: string) =>
    lang === 'en' ? `NODE ${id} TRANSFERRED → ${to}` : `УЗЕЛ ${id} ПЕРЕДАН → ${to}`,
  nodeSold: (lang: Lang, id: string, price: string) =>
    lang === 'en' ? `NODE ${id} SOLD · +${price} · RETURNED TO MARKET` : `УЗЕЛ ${id} ПРОДАН · +${price} · ВОЗВРАЩЁН НА РЫНОК`,
  agentHome: (lang: Lang) => (lang === 'en' ? 'AGENT RETURNED TO THE CENTER OF THE WEB' : 'АГЕНТ ВЕРНУЛСЯ В ЦЕНТР ПАУТИНЫ'),
  agentListens: (lang: Lang, id: string) => (lang === 'en' ? `AGENT LISTENS TO NODE ${id}` : `АГЕНТ СЛУШАЕТ УЗЕЛ ${id}`),
  agentHeadsToTear: (lang: Lang, label: string) => (lang === 'en' ? `AGENT HEADS TO THE TEAR ${label}` : `АГЕНТ ИДЁТ К РАЗРЫВУ ${label}`),
  agentWeaving: (lang: Lang) => (lang === 'en' ? 'AGENT IS WEAVING NEW SILK...' : 'АГЕНТ ПЛЕТЁТ НОВУЮ НИТЬ...'),
  threadRestored: (lang: Lang, label: string) => (lang === 'en' ? `THREAD ${label} RESTORED` : `НИТЬ ${label} ВОССТАНОВЛЕНА`),
  threadTorn: (lang: Lang, label: string) => (lang === 'en' ? `THREAD TEAR ${label}` : `РАЗРЫВ НИТИ ${label}`),
  agentInspects: (lang: Lang, id: string) =>
    lang === 'en' ? `AGENT INSPECTS THE NEW BOND AT NODE ${id}` : `АГЕНТ ИЗУЧАЕТ НОВУЮ СВЯЗЬ У УЗЛА ${id}`,
  walletSwitched: (lang: Lang) =>
    lang === 'en' ? 'WALLET SWITCHED ACCOUNT — SESSION CLOSED' : 'КОШЕЛЁК СМЕНИЛ АККАУНТ — СЕССИЯ ЗАКРЫТА',
  walletUnlinked: (lang: Lang, nickname: string, addr: string) =>
    lang === 'en' ? `${nickname} UNLINKED WALLET ${addr}` : `${nickname} ОТВЯЗАЛ КОШЕЛЁК ${addr}`,
  newProfile: (lang: Lang, nickname: string, addr: string) =>
    lang === 'en' ? `NEW PROFILE ${nickname} · ${addr} WOVEN INTO THE WEB` : `НОВЫЙ ПРОФИЛЬ ${nickname} · ${addr} ВПЛЕТЁН В СЕТЬ`,
  profileReturned: (lang: Lang, nickname: string, walletName: string) =>
    lang === 'en' ? `${nickname} RETURNED TO THE WEB · ${walletName}` : `${nickname} ВЕРНУЛСЯ В СЕТЬ · ${walletName}`,
  spiderTearSay: (lang: Lang, label: string) =>
    lang === 'en' ? `the thread ${label.toLowerCase()} snapped. going.` : `нить ${label.toLowerCase()} лопнула. иду.`,
  spiderRepairDoneSay: (lang: Lang) => (lang === 'en' ? 'whole again. this time.' : 'снова цело. на этот раз.'),
  spiderCelebrateSay: (lang: Lang) => (lang === 'en' ? 'a new thread. I feel it.' : 'новая нить. я чувствую её.'),
}
