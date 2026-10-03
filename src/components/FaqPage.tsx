import type { ReactNode } from 'react'
import { ARACHNE_LORE, OWNER_RIGHTS, PATTERN_STAGES, ROLE_PERKS } from '../data/lore'
import { ROLE_ARCHETYPES } from '../data/roles'
import { ui } from '../i18n/ui'
import { useLanguage, type Lang } from '../state/LanguageContext'
import SpiderAvatar from './SpiderAvatar'
import WebIcon from './WebIcon'

type Icon = 'spider' | 'web' | 'web-warm' | 'none'

interface FaqItem {
  id: string
  icon: Icon
  q: { en: string; ru: string }
  a: (lang: Lang) => ReactNode
  related: string[]
}

const FAQ: FaqItem[] = [
  {
    id: 'what',
    icon: 'spider',
    q: { en: 'What is ARACHNE?', ru: 'Что такое ARACHNE?' },
    a: (lang) =>
      lang === 'en'
        ? 'An AI agent shaped like a spider, living at the center of a web of 72 nodes. Each node is not a picture — it is a fragment of her memory with its own role. People claim nodes and, by doing so, shape what the spider thinks, says, and remembers.'
        : 'ИИ-агент в образе паука, который живёт в центре паутины из 72 узлов. Каждый узел — не картинка, а фрагмент её памяти с собственной ролью. Люди занимают узлы и тем самым влияют на то, что паук думает, говорит и вспоминает.',
    related: ['goal', 'roles'],
  },
  {
    id: 'goal',
    icon: 'spider',
    q: { en: 'What is her goal?', ru: 'В чём её цель?' },
    a: (lang) => (
      <>
        {ARACHNE_LORE.long[lang].map((p) => (
          <p key={p} className="mb-2 last:mb-0">
            {p}
          </p>
        ))}
      </>
    ),
    related: ['pattern', 'what'],
  },
  {
    id: 'pattern',
    icon: 'web',
    q: { en: 'What is the Pattern?', ru: 'Что такое Узор?' },
    a: (lang) => (
      <>
        <p className="mb-2">
          {lang === 'en'
            ? 'The overall progress of the whole web: claimed nodes plus living threads (threads with both ends claimed — they glow red). All owners move the Pattern together. Every threshold unlocks something new:'
            : 'Общий прогресс всей паутины: занятые узлы плюс живые нити (нити, у которых оба конца заняты, — они светятся красным). Узор двигают все владельцы вместе. На каждом пороге открывается что-то новое:'}
        </p>
        <ul className="flex flex-col gap-1">
          {PATTERN_STAGES.map((s) => (
            <li key={s.title.en}>
              <span className="text-[var(--eye-glow)]">
                {Math.round(s.threshold * 100)}% · {s.title[lang]}
              </span>{' '}
              — {s.reward[lang]}
            </li>
          ))}
        </ul>
      </>
    ),
    related: ['why-buy', 'goal'],
  },
  {
    id: 'why-buy',
    icon: 'web-warm',
    q: { en: 'Why get a node?', ru: 'Зачем покупать узел?' },
    a: (lang) => (
      <>
        <ul className="mb-2 flex flex-col gap-1">
          {OWNER_RIGHTS[lang].map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
        <p>
          {lang === 'en'
            ? "It pays off most to claim nodes next to ones already claimed: every such neighbor is another living thread and more Pattern percent. The node window shows how many threads you'd wake."
            : 'Выгоднее всего занимать узлы рядом с уже занятыми: каждый такой сосед — ещё одна живая нить и больше процентов Узора. В окне узла видно, сколько нитей ты оживишь.'}
        </p>
      </>
    ),
    related: ['roles', 'pattern'],
  },
  {
    id: 'roles',
    icon: 'web',
    q: { en: 'What does a role grant?', ru: 'Что даёт роль узла?' },
    a: (lang) => (
      <>
        <p className="mb-2">
          {lang === 'en'
            ? 'The ring sets the stack layer (from CORE at the center to PERIPHERY), and the ray sets the role. Each role has its own ability. Those marked ● already work; the rest arrive with the full agent in Phase 3.'
            : 'Кольцо определяет слой стека (от ЯДРА у центра до ПЕРИФЕРИИ), а луч — роль. У каждой роли своя способность. Отмеченные ● уже работают, остальные включатся вместе с полноценным агентом в Фазе 3.'}
        </p>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {ROLE_ARCHETYPES.map((role) => {
            const p = ROLE_PERKS[role.id]
            return (
              <li key={role.id}>
                <span className={p.live ? 'text-[var(--eye-glow)]' : 'text-[var(--text)]'}>
                  {p.live ? '●' : '○'} {role.name[lang]}
                </span>{' '}
                — {p.perk[lang]}
              </li>
            )
          })}
        </ul>
      </>
    ),
    related: ['why-buy', 'profile'],
  },
  {
    id: 'chat',
    icon: 'spider',
    q: { en: 'Can I talk to the spider?', ru: 'Можно поговорить с пауком?' },
    a: (lang) =>
      lang === 'en'
        ? 'Yes — in the "Voice of Arachne" panel next to the web. Without a node you get 3 questions (vibrations) a day and she hears you faintly. With a node — no limit: she knows your name, remembers your nodes and whispers. Right now she answers from her own internal "dictionary"; in Phase 3 a full language model takes her place.'
        : 'Да — в панели «Голос Арахны» рядом с паутиной. Без узла у тебя 3 вопроса (вибрации) в день и паук слышит тебя слабо. С узлом — без лимита: она знает тебя по имени, помнит твои узлы и шёпоты. Сейчас она отвечает по своему внутреннему «словарю», в Фазе 3 её место займёт полноценная языковая модель.',
    related: ['why-buy', 'movement'],
  },
  {
    id: 'movement',
    icon: 'spider',
    q: { en: 'How does the spider move?', ru: 'Как работает паук?' },
    a: (lang) =>
      lang === 'en'
        ? 'The spider walks strictly along the threads, picking the shortest route: it accelerates, eases smoothly through turns, brakes near its target, and rests at the center. It visits active and whispering nodes most often. Standing still — it does not move a leg; walking — it does.'
        : 'Паук ходит строго по нитям, выбирая кратчайший путь: разгоняется, плавно проходит повороты, тормозит у цели и отдыхает в центре. Чаще всего навещает активные узлы и узлы с шёпотом. Стоит — не шевелится, идёт — перебирает лапами.',
    related: ['tear', 'chat'],
  },
  {
    id: 'tear',
    icon: 'web-warm',
    q: { en: 'Why does the web tear?', ru: 'Почему паутина рвётся?' },
    a: (lang) =>
      lang === 'en'
        ? 'Every so often a thread snaps — a red flash and loose ends dangling. The spider heads to the nearest whole end and re-spins the thread, anchoring silk along the way. Neither the spider nor the light pulses cross a torn thread.'
        : 'Время от времени нить лопается — красная вспышка и свисающие обрывки. Паук идёт к ближайшему целому концу и заново плетёт нить, закрепляя шёлк по пути. Через порванную нить не ходят ни паук, ни импульсы.',
    related: ['movement', 'flow'],
  },
  {
    id: 'flow',
    icon: 'web-warm',
    q: { en: "What's the light running on the threads?", ru: 'Что за свет бежит по нитям?' },
    a: (lang) =>
      lang === 'en'
        ? 'Every few seconds a wave of light spreads from the central node down every thread. And red charges travel node to node: a node fills with light like water, and the charge flows on into a neighbor.'
        : 'Из центральной ноды каждые несколько секунд расходится волна света по всем нитям. А красные заряды путешествуют от узла к узлу: узел наполняется светом, как водой, и заряд перетекает в соседа.',
    related: ['tear'],
  },
  {
    id: 'login',
    icon: 'none',
    q: { en: 'How do I log in?', ru: 'Как войти в сеть?' },
    a: (lang) =>
      lang === 'en'
        ? 'Wallet only: MetaMask, Phantom (Solana), Coinbase Wallet, Rabby, and any other extension that announces itself to the browser. After connecting you sign the message "I enter the web" — free, no transaction. No extension — login runs in demo mode with a test address. Lose the wallet, lose access: that is a deliberate choice.'
        : 'Только кошелёк: MetaMask, Phantom (Solana), Coinbase Wallet, Rabby и любые другие расширения, которые сообщают о себе браузеру. После подключения нужно подписать сообщение «Я вхожу в паутину» — бесплатно и без транзакций. Нет расширения — вход в демо-режиме с тестовым адресом. Потерял кошелёк — потерял доступ: это осознанное решение.',
    related: ['profile'],
  },
  {
    id: 'profile',
    icon: 'spider',
    q: { en: "What's in the profile?", ru: 'Что есть в профиле?' },
    a: (lang) =>
      lang === 'en'
        ? "Created automatically on first login. It shows your nodes, their value, whispers and your own threads; you can change your nickname, name a node, write a whisper, transfer a node to another address, sell it, or unlink your wallet."
        : 'Профиль создаётся сам при первом входе. В нём твои узлы, их ценность, шёпоты и свои нити; можно сменить никнейм, назвать узел, вписать шёпот, передать узел на другой адрес, продать его или отвязать кошелёк.',
    related: ['login', 'roles'],
  },
  {
    id: 'next',
    icon: 'none',
    q: { en: "What's next?", ru: 'Что дальше?' },
    a: (lang) =>
      lang === 'en'
        ? 'Right now purchases, sales and transfers are simulated and stored only in your browser (Phase 1). Next: a backend with signature verification and a shared lot database (Phase 2), an AI agent on Groq that reads whispers and drives the conversation itself (Phase 3), real payments and revenue share (Phase 4).'
        : 'Сейчас покупки, продажи и передачи симулируются и хранятся только в твоём браузере (Фаза 1). Дальше: бэкенд с проверкой подписи и общей базой лотов (Фаза 2), ИИ-агент на Groq, который читает шёпоты и сам ведёт разговор (Фаза 3), реальная оплата и revenue share (Фаза 4).',
    related: [],
  },
]

const BY_ID = new Map(FAQ.map((f) => [f.id, f]))

function Icon({ icon }: { icon: Icon }) {
  if (icon === 'spider') return <SpiderAvatar size={28} />
  if (icon === 'web') return <WebIcon size={26} />
  if (icon === 'web-warm') return <WebIcon size={26} warm />
  return <span className="h-[26px] w-[26px]" />
}

export default function FaqPage() {
  const { lang } = useLanguage()
  const t = ui(lang)

  return (
    <div
      className="flex h-full flex-col overflow-y-auto border-2 border-[var(--surface)] bg-[var(--surface)]/40 p-4 sm:p-6"
      style={{ fontFamily: 'var(--font-data)' }}
    >
      <div className="mb-6 flex items-center gap-3">
        <SpiderAvatar size={48} pulse />
        <div>
          <h2 className="text-[10px] tracking-widest text-[var(--muted)]" style={{ fontFamily: 'var(--font-display)' }}>
            {t.faq.title}
          </h2>
          <p className="text-sm text-[var(--active)]" style={{ fontFamily: 'var(--font-display)' }}>
            {ARACHNE_LORE.title[lang]}
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        {FAQ.map((item) => (
          <div key={item.id} className="border-b border-[var(--muted)]/20 pb-4">
            <div className="mb-2 flex items-center gap-2.5">
              <Icon icon={item.icon} />
              <h3 className="text-xs text-[var(--eye-glow)]">{item.q[lang]}</h3>
            </div>
            <div className="text-xs leading-relaxed text-[var(--text)]">{item.a(lang)}</div>
            {item.related.length > 0 && (
              <div className="mt-2 text-[10px] text-[var(--muted)]">
                {lang === 'en' ? 'See also: ' : 'См. также: '}
                {item.related.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    {BY_ID.get(id)!.q[lang]}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
