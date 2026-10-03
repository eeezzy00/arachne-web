import { CENTER } from '../../sim/geometry'

/** Period of the light ring the core sends down the threads (shared SMIL clock). */
export const PULSE_SECONDS = 5

const dur = `${PULSE_SECONDS}s`
// a quick flash right as each pulse leaves the core, then a slow fade
const FLASH_TIMES = '0;0.06;0.4;1'

export default function CoreNode() {
  return (
    <g transform={`translate(${CENTER},${CENTER})`} pointerEvents="none">
      <defs>
        <radialGradient id="core-halo">
          <stop offset="0" stopColor="#ff2a2a" stopOpacity={0.55} />
          <stop offset="0.45" stopColor="#8b0000" stopOpacity={0.22} />
          <stop offset="1" stopColor="#8b0000" stopOpacity={0} />
        </radialGradient>
      </defs>

      <circle r={130} fill="url(#core-halo)">
        <animate attributeName="opacity" values="0.55;1;0.7;0.55" keyTimes={FLASH_TIMES} dur={dur} repeatCount="indefinite" />
        <animate attributeName="r" values="115;140;125;115" keyTimes={FLASH_TIMES} dur={dur} repeatCount="indefinite" />
      </circle>

      <g className="core-ring">
        {/* symmetric bounds so the ring spins around its exact centre */}
        <circle r={48} fill="transparent" />
        <circle r={44} fill="none" strokeWidth={1.4} strokeDasharray="5 7" style={{ stroke: 'var(--eye)' }} />
        {[0, 120, 240].map((deg) => (
          <rect
            key={deg}
            x={-2}
            y={-46}
            width={4}
            height={4}
            transform={`rotate(${deg})`}
            shapeRendering="crispEdges"
            style={{ fill: 'var(--eye-glow)' }}
          />
        ))}
      </g>
      <g className="core-ring reverse">
        <circle r={34} fill="none" strokeWidth={1} strokeDasharray="1 6" opacity={0.7} style={{ stroke: 'var(--web)' }} />
      </g>

      <g transform="rotate(45)">
        <rect x={-15} y={-15} width={30} height={30} strokeWidth={2} shapeRendering="crispEdges" style={{ fill: 'var(--spider)', stroke: 'var(--eye)' }} />
        <rect x={-8} y={-8} width={16} height={16} shapeRendering="crispEdges" fill="#ff2a2a">
          <animate
            attributeName="fill"
            values="#ff2a2a;#ffffff;#ff5050;#ff2a2a"
            keyTimes={FLASH_TIMES}
            dur={dur}
            repeatCount="indefinite"
          />
        </rect>
      </g>
    </g>
  )
}
