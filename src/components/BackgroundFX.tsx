import { sagControl, type Point } from '../sim/geometry'

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const FLIP: Record<Corner, string> = {
  tl: 'none',
  tr: 'scaleX(-1)',
  bl: 'scaleY(-1)',
  br: 'scale(-1, -1)',
}

const POSITION: Record<Corner, string> = {
  tl: 'left-0 top-0',
  tr: 'right-0 top-0',
  bl: 'left-0 bottom-0',
  br: 'right-0 bottom-0',
}

function noise(n: number): number {
  const s = Math.sin(n * 91.7 + 17.3) * 43758.5453
  return s - Math.floor(s)
}

const toD = (a: Point, c: Point, b: Point) =>
  `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`

interface OrbWeb {
  threads: string[]
  spokes: number
  dew: Point[]
}

/**
 * An orb web around `anchor` spanning angles [from, to]. A full circle gives a
 * free-standing web; a quarter anchored at (0,0) gives a corner cobweb.
 */
function orbWeb(anchor: Point, radius: number, from: number, to: number, spokes: number, rings: number, seed: number): OrbWeb {
  const full = to - from >= Math.PI * 2 - 1e-6
  const count = full ? spokes : spokes - 1
  const angles = Array.from({ length: spokes }, (_, i) => from + ((to - from) * i) / count + (noise(seed + i) - 0.5) * 0.1)
  const point = (s: number, ring: number): Point => {
    const r = (ring / rings) * radius * (1 + (noise(seed * 7 + s * 13 + ring) - 0.5) * 0.09)
    return { x: anchor.x + Math.cos(angles[s]) * r, y: anchor.y + Math.sin(angles[s]) * r }
  }

  const threads: string[] = []
  const dew: Point[] = []
  for (let s = 0; s < spokes; s++) {
    const end = point(s, rings)
    threads.push(`M${anchor.x},${anchor.y} L${end.x.toFixed(1)},${end.y.toFixed(1)}`)
  }
  const pairs = full ? spokes : spokes - 1
  for (let ring = 1; ring <= rings; ring++) {
    for (let s = 0; s < pairs; s++) {
      const a = point(s, ring)
      const b = point((s + 1) % spokes, ring)
      const c = sagControl(a, b, anchor, 0.13)
      threads.push(toD(a, c, b))
      if (noise(seed * 3 + ring * 17 + s) > 0.86) dew.push(a)
    }
  }
  return { threads, spokes, dew }
}

interface CornerWebProps {
  corner: Corner
  size: number
  spokes: number
  rings: number
  opacity: number
  seed: number
}

function CornerWeb({ corner, size, spokes, rings, opacity, seed }: CornerWebProps) {
  const web = orbWeb({ x: 0, y: 0 }, size * 0.95, 0, Math.PI / 2, spokes, rings, seed)
  return (
    <div className={`absolute ${POSITION[corner]}`} style={{ width: size, height: size, transform: FLIP[corner] }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        fill="none"
        style={{ transformOrigin: '0 0', animation: `corner-sway ${9 + seed}s ease-in-out infinite alternate` }}
      >
        <g opacity={opacity} style={{ stroke: 'var(--web)' }}>
          {web.threads.map((d, i) => (
            <path key={i} d={d} strokeWidth={i < web.spokes ? 1.1 : 0.8} />
          ))}
        </g>
        {web.dew.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.6}
            className="dew"
            style={{ animationDelay: `${-noise(seed + i) * 6}s`, animationDuration: `${4 + noise(i + seed * 5) * 4}s` }}
          />
        ))}
      </svg>
    </div>
  )
}

interface FarWebProps {
  left: string
  top: string
  size: number
  opacity: number
  seed: number
  spin: number
}

/** A large, blurred, slowly turning web deep in the background. */
function FarWeb({ left, top, size, opacity, seed, spin }: FarWebProps) {
  const r = size / 2
  const web = orbWeb({ x: r, y: r }, r * 0.96, 0, Math.PI * 2, 14, 10, seed)
  return (
    <div
      className="absolute"
      style={{ left, top, width: size, height: size, transform: 'translate(-50%, -50%)' }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        fill="none"
        style={{ animation: `core-spin ${Math.abs(spin)}s linear infinite ${spin < 0 ? 'reverse' : 'normal'}` }}
      >
        <g opacity={opacity} strokeWidth={0.9} style={{ stroke: 'var(--web)' }}>
          {web.threads.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {web.dew.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.4}
            className="dew"
            style={{ animationDelay: `${-noise(seed + i) * 8}s`, animationDuration: `${5 + noise(i * 3 + seed) * 5}s` }}
          />
        ))}
      </svg>
    </div>
  )
}

interface Mote {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
}

const MOTES: Mote[] = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  size: 1 + Math.round(Math.random() * 2),
  duration: 14 + Math.random() * 18,
  delay: -Math.random() * 20,
  opacity: 0.15 + Math.random() * 0.35,
}))

const HANGING = [
  { left: '14%', length: 170, delay: 0, spider: true },
  { left: '38%', length: 70, delay: -3, spider: false },
  { left: '63%', length: 110, delay: -2, spider: false },
  { left: '86%', length: 230, delay: -4, spider: true },
]

export default function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg)]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(139,0,0,0.1) 0%, rgba(8,8,8,0) 55%), radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      <div className="fog fog-a" />
      <div className="fog fog-b" />

      {/* an echo of the main web, far behind it */}
      <FarWeb left="50%" top="54%" size={1500} opacity={0.075} seed={10} spin={-600} />
      <FarWeb left="8%" top="78%" size={760} opacity={0.1} seed={11} spin={420} />
      <FarWeb left="93%" top="18%" size={620} opacity={0.09} seed={12} spin={-360} />
      <FarWeb left="72%" top="96%" size={420} opacity={0.08} seed={13} spin={300} />
      <FarWeb left="30%" top="4%" size={360} opacity={0.07} seed={14} spin={260} />

      <CornerWeb corner="tl" size={520} spokes={7} rings={9} opacity={0.14} seed={1} />
      <CornerWeb corner="br" size={460} spokes={6} rings={8} opacity={0.12} seed={2} />
      <CornerWeb corner="tr" size={260} spokes={5} rings={5} opacity={0.1} seed={3} />
      <CornerWeb corner="bl" size={220} spokes={5} rings={4} opacity={0.1} seed={4} />

      {HANGING.map((h) => (
        <div
          key={h.left}
          className="absolute top-0 flex flex-col items-center"
          style={{
            left: h.left,
            transformOrigin: 'top center',
            animation: `thread-sway 5s ease-in-out infinite alternate`,
            animationDelay: `${h.delay}s`,
          }}
        >
          <div className="w-px bg-[var(--web)] opacity-[0.12]" style={{ height: h.length }} />
          {h.spider ? (
            <div
              className="spider-sprite -mt-1 h-5 w-5 opacity-40"
              style={{
                backgroundImage: 'url(/sprites/spider-sheet.png)',
                backgroundSize: '2500% 100%',
                transform: 'rotate(180deg)',
                animation: 'hang-bob 6s ease-in-out infinite',
              }}
            />
          ) : (
            <div className="h-[5px] w-[5px] rounded-full bg-[var(--web)] opacity-[0.14]" />
          )}
        </div>
      ))}

      {MOTES.map((m) => (
        <span
          key={m.id}
          className="absolute rounded-full bg-[var(--web)]"
          style={{
            left: `${m.left}%`,
            bottom: -10,
            width: m.size,
            height: m.size,
            opacity: m.opacity,
            animation: `mote-rise ${m.duration}s linear infinite`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)',
        }}
      />
    </div>
  )
}
