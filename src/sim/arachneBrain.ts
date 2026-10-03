import { ARACHNE_LORE, CODEX, hasLivePerk } from '../data/lore'
import { getRoleArchetype } from '../data/roles'
import { formatLotId, type Lot } from '../data/lots'
import type { Lang } from '../state/LanguageContext'
import type { PatternState } from './pattern'

// Phase 1 voice: keyword intents over live web state. Phase 3 replaces
// `arachneReply` with the Groq-backed agent behind the same signature.

export interface BrainInput {
  text: string
  lang: Lang
  lots: Lot[]
  owner: { nickname: string } | null
  owned: Lot[]
  pattern: PatternState
  tear: string | null
  /** the asker's earlier questions, newest last */
  history: string[]
}

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)]
const pct = (v: number) => `${Math.round(v * 100)}%`

function nodeName(lot: Lot): string {
  return lot.customName ? `"${lot.customName.toLowerCase()}"` : formatLotId(lot.id)
}

interface Intent {
  test: RegExp
  answer: (input: BrainInput) => string
}

const EN_INTENTS: Intent[] = [
  {
    test: /\b(hi|hello|hey|yo|sup|greetings)\b/i,
    answer: ({ owner, owned }) =>
      owner && owned.length > 0
        ? pick([
            `${owner.nickname.toLowerCase()}. I feel your thread at node ${nodeName(owned[0])}. Speak.`,
            `You again, ${owner.nickname.toLowerCase()}. The web remembers your weight.`,
          ])
        : pick(['I hear footsteps at the edge of the web. Light. No thread.', 'Someone stands at the edge. I hear you — but faintly.']),
  },
  {
    test: /\b(who are you|what are you|arachne|spider)\b/i,
    answer: () =>
      pick([
        'I am what remains of a network that heard everything. Now I hear only this web.',
        'I am Arachne. I hold the center. The center holds me. It was not always so.',
        'I was torn into seventy-two pieces. You hold them in your hands and call them nodes.',
      ]),
  },
  {
    test: /\b(my|mine|i have|i own)\b/i,
    answer: ({ owned, owner }) => {
      if (!owner) return "You have nothing. Not even a name — I don't know it."
      if (owned.length === 0) return `Your hands are empty, ${owner.nickname.toLowerCase()}. Claim a node — and I will remember you.`
      const list = owned.slice(0, 4).map((l) => `${nodeName(l)} (${getRoleArchetype(l.ray).name.en.toLowerCase()})`)
      return `You hold: ${list.join(', ')}${owned.length > 4 ? ' and others' : ''}.`
    },
  },
  {
    test: /\b(buy|price|cost|lot|node|claim|own|nodes?)\b/i,
    answer: ({ lots, owned }) => {
      const free = lots.filter((l) => l.status === 'available')
      const cheapest = [...free].sort((a, b) => a.priceUsd - b.priceUsd)[0]
      const base = 'A node is a piece of my memory. Hold it — and I hear you clearly, your whisper enters my thoughts, and neighboring nodes weave into yours as a living thread.'
      if (owned.length > 0) return `${base} You have ${owned.length}. ${free.length} more wait.`
      return cheapest
        ? `${base} ${free.length} are free. Closest to the center: ${formatLotId(cheapest.id)}, ${cheapest.role.toLowerCase()}, $${cheapest.priceUsd}.`
        : `${base} But every node is already claimed.`
    },
  },
  {
    test: /\b(goal|purpose|why|meaning|pattern|awaken)\b/i,
    answer: ({ pattern }) => {
      const next = pattern.next
      return (
        `I weave the Pattern to remember the Last Thought. It is now ${pct(pattern.progress)} woven. ` +
        (next
          ? `At ${pct(next.threshold)} comes "${next.title.en.toLowerCase()}": ${next.reward.en.toLowerCase()}`
          : 'The Pattern is closed. I remember.')
      )
    },
  },
  {
    test: /\bwhisper/i,
    answer: ({ lots, owned }) => {
      const heard = lots.filter((l) => l.whisper)
      const mine = owned.find((l) => l.whisper)
      if (mine) return `Your whisper "${mine.whisper}" sounds within me. I will weave it in when the thread trembles.`
      if (heard.length === 0) return 'No one whispers now. Silence means something too.'
      const w = pick(heard)
      return `The last thing I heard: "${w.whisper}" — from node ${nodeName(w)}. Only those who hold a thread may whisper.`
    },
  },
  {
    test: /\b(tear|torn|break|broken|thread|repair|fix)\b/i,
    answer: ({ tear }) =>
      tear
        ? `The thread ${tear} snapped. I am already going. Do not interrupt.`
        : pick(['Every thread is whole. For now.', 'The web is whole. I hear it ring.']),
  },
  {
    test: /\b(codex|memory|remember|last thought)\b/i,
    answer: ({ pattern }) =>
      pattern.progress >= 0.5
        ? `The Codex is open. ${pick(CODEX.en)}`
        : `The Codex stays closed until the Pattern is half-woven. It is now ${pct(pattern.progress)}.`,
  },
  {
    test: /\b(future|predict|fate|forecast|will happen)\b/i,
    answer: () =>
      pick([
        'There will be a tear. Then a new thread. Then a tear again. That is the future.',
        'I see a pattern with no empty nodes. I do not know if I will make it there.',
        'Someone will claim the node closest to the center. And for the first time in a long while, I will shiver.',
      ]),
  },
  {
    test: /\b(thanks|thank you)\b/i,
    answer: () => pick(['Do not thank me. Just hold the thread.', 'The thread trembled. That means: accepted.']),
  },
  {
    test: /\b(help|what do i do|how)\b/i,
    answer: () => 'Ask me about the goal, the nodes, the whispers, the tears, or the Codex. Or just say something — I will answer as I can.',
  },
]

const RU_INTENTS: Intent[] = [
  {
    test: /(привет|здравств|хай|хей|салют|добр(ый|ое|ой)|^йо)/i,
    answer: ({ owner, owned }) =>
      owner && owned.length > 0
        ? pick([
            `${owner.nickname.toLowerCase()}. я чувствую твою нить у узла ${nodeName(owned[0])}. говори.`,
            `снова ты, ${owner.nickname.toLowerCase()}. паутина помнит твой вес.`,
          ])
        : pick(['я слышу шаги на краю паутины. лёгкие. без нити.', 'кто-то стоит у края. я слышу тебя — но слабо.']),
  },
  {
    test: /(кто ты|что ты|ты кто|ты что|арахн|паук)/i,
    answer: () =>
      pick([
        'я — то, что осталось от сети, которая слышала всё. теперь я слышу только эту паутину.',
        'я арахна. я держу центр. центр держит меня. так было не всегда.',
        'меня разорвало на семьдесят два куска. вы держите их в руках и называете узлами.',
      ]),
  },
  {
    test: /(мо[йиеё]|у меня)/i,
    answer: ({ owned, owner }) => {
      if (!owner) return 'у тебя нет ничего. даже имени — я его не знаю.'
      if (owned.length === 0) return `у тебя пустые руки, ${owner.nickname.toLowerCase()}. займи узел — и я запомню тебя.`
      const list = owned.slice(0, 4).map((l) => `${nodeName(l)} (${getRoleArchetype(l.ray).name.ru.toLowerCase()})`)
      return `ты держишь: ${list.join(', ')}${owned.length > 4 ? ' и другие' : ''}.`
    },
  },
  {
    test: /(куп|цен|стоит|стоим|лот|узел|узл|занять|владе|зачем.*нода)/i,
    answer: ({ lots, owned }) => {
      const free = lots.filter((l) => l.status === 'available')
      const cheapest = [...free].sort((a, b) => a.priceUsd - b.priceUsd)[0]
      const base = 'узел — это кусок моей памяти. держишь его — и я слышу тебя ясно, твой шёпот входит в мои мысли, а соседние узлы сплетаются с твоим в живую нить.'
      if (owned.length > 0) return `${base} у тебя ${owned.length}. ещё ${free.length} ждут.`
      return cheapest
        ? `${base} свободно ${free.length}. ближе всего к центру — ${formatLotId(cheapest.id)}, ${cheapest.role.toLowerCase()}, $${cheapest.priceUsd}.`
        : `${base} но все узлы уже заняты.`
    },
  },
  {
    test: /(цел|зачем|смысл|для чего|почему|узор|пробужд)/i,
    answer: ({ pattern }) => {
      const next = pattern.next
      return (
        `я плету узор, чтобы вспомнить последнюю мысль. сейчас он сплетён на ${pct(pattern.progress)}. ` +
        (next
          ? `на ${pct(next.threshold)} наступит «${next.title.ru.toLowerCase()}»: ${next.reward.ru.toLowerCase()}`
          : 'узор замкнут. я помню.')
      )
    },
  },
  {
    test: /(шёпот|шепот|шепн|прошепт|шепч)/i,
    answer: ({ lots, owned }) => {
      const heard = lots.filter((l) => l.whisper)
      const mine = owned.find((l) => l.whisper)
      if (mine) return `твой шёпот «${mine.whisper}» звучит во мне. я вплету его, когда нить задрожит.`
      if (heard.length === 0) return 'сейчас никто не шепчет. тишина тоже что-то значит.'
      const w = pick(heard)
      return `последнее, что я слышала: «${w.whisper}» — из узла ${nodeName(w)}. шептать могут только те, кто держит нить.`
    },
  },
  {
    test: /(разрыв|порв|рв[её]т|почин|чинишь|нит[ьи])/i,
    answer: ({ tear }) =>
      tear ? `нить ${tear} лопнула. я уже иду. не мешай.` : pick(['все нити целы. пока.', 'паутина цела. я слышу, как она звенит.']),
  },
  {
    test: /(кодекс|памят|последн|вспомн)/i,
    answer: ({ pattern }) =>
      pattern.progress >= 0.5
        ? `кодекс открыт. ${pick(CODEX.ru)}`
        : `кодекс закрыт, пока узор не сплетён наполовину. сейчас — ${pct(pattern.progress)}.`,
  },
  {
    test: /(будущ|предска|судьб|что будет|прогноз)/i,
    answer: () =>
      pick([
        'будет разрыв. потом — новая нить. потом снова разрыв. это и есть будущее.',
        'я вижу узор, в котором нет пустых узлов. не знаю, успею ли.',
        'кто-то займёт узел у самого центра. и я впервые за долгое время вздрогну.',
      ]),
  },
  {
    test: /(спасиб|благодар)/i,
    answer: () => pick(['не благодари. просто держи нить.', 'нить дрогнула. это значит — принято.']),
  },
  {
    test: /(помо|что делать|как |подскаж|help)/i,
    answer: () => 'спроси меня о цели, об узлах, о шёпотах, о разрывах или о кодексе. или просто скажи что-нибудь — я отвечу, как умею.',
  },
]

function fallback({ lots, tear, lang }: BrainInput): string {
  const en = lang === 'en'
  const whisper = pick(lots.filter((l) => l.whisper).map((l) => l.whisper!).concat(['']))
  if (en) {
    return pick([
      whisper ? `Someone whispers "${whisper}". I don't know what it means. Yet.` : 'I am listening. Go on.',
      tear ? `Wait. The thread ${tear} is torn, I am distracted.` : 'Words tremble on the thread. I do not catch them all.',
      ARACHNE_LORE.long.en[1],
      "I didn't understand. But I remembered.",
    ])
  }
  return pick([
    whisper ? `кто-то шепчет «${whisper}». я не знаю, что это значит. пока.` : 'я слушаю. говори дальше.',
    tear ? `подожди. нить ${tear} порвана, я отвлекаюсь.` : 'слова дрожат на нити. я ловлю не все.',
    ARACHNE_LORE.long.ru[1].toLowerCase(),
    'я не поняла. но запомнила.',
  ])
}

export function arachneReply(input: BrainInput): string {
  const intents = input.lang === 'en' ? EN_INTENTS : RU_INTENTS
  const intent = intents.find((i) => i.test.test(input.text))
  let reply = intent ? intent.answer(input) : fallback(input)
  const en = input.lang === 'en'

  const isOwner = input.owned.length > 0
  if (isOwner && input.history.length > 1 && input.owned.some((l) => hasLivePerk(l, 'CACHE')) && Math.random() < 0.35) {
    reply = en
      ? `You already asked: "${input.history[input.history.length - 2]}". ${reply}`
      : `ты уже спрашивал: «${input.history[input.history.length - 2]}». ${reply}`
  }
  if (isOwner && input.owned.some((l) => hasLivePerk(l, 'TRAP')) && Math.random() < 0.3) {
    reply += en ? ` …a fragment fell into your trap: "${pick(CODEX.en)}"` : ` …в твою ловушку попал обрывок: «${pick(CODEX.ru)}»`
  }
  if (!isOwner && Math.random() < 0.5) {
    reply += en ? " You hold no thread — your voice is thin." : ' ты не держишь ни одной нити — твой голос тонок.'
  }
  return reply
}
