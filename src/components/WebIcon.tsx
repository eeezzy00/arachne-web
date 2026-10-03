interface WebIconProps {
  size?: number
  className?: string
  /** highlights the icon red, e.g. for tear/thread-themed questions */
  warm?: boolean
}

/** A tiny orb-web glyph used to illustrate web/thread-themed FAQ entries. */
export default function WebIcon({ size = 22, className, warm = false }: WebIconProps) {
  const spokes = 8
  const rings = 3
  const R = 18
  const point = (ring: number, spoke: number) => {
    const a = (spoke / spokes) * Math.PI * 2 - Math.PI / 2
    const r = (ring / rings) * R
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }
  const color = warm ? 'var(--eye-glow)' : 'var(--web)'

  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} className={className}>
      {Array.from({ length: spokes }, (_, i) => {
        const p = point(rings, i)
        return <line key={i} x1={0} y1={0} x2={p.x} y2={p.y} strokeWidth={1} style={{ stroke: color, opacity: 0.5 }} />
      })}
      {Array.from({ length: rings }, (_, ring) => (
        <polygon
          key={ring}
          points={Array.from({ length: spokes }, (_, i) => {
            const p = point(ring + 1, i)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
          fill="none"
          strokeWidth={0.8}
          style={{ stroke: color, opacity: 0.6 }}
        />
      ))}
      <circle r={2} style={{ fill: color }} />
    </svg>
  )
}
