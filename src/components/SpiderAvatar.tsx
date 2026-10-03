interface SpiderAvatarProps {
  size?: number
  /** pulses the eyes, used for the small header badge */
  pulse?: boolean
  className?: string
}

/**
 * A pixel-art close-up of Arachne's face: the front pair of eyes glowing red,
 * two smaller pairs below, and a hint of fangs. Built from crisp rects on a
 * grid so it matches the sprite's pixel style without needing an image asset.
 */
export default function SpiderAvatar({ size = 40, pulse = false, className }: SpiderAvatarProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width="20" height="20" fill="var(--spider)" />
      {/* head plates */}
      <rect x="2" y="1" width="16" height="15" fill="#141414" />
      <rect x="1" y="3" width="1" height="10" fill="#141414" />
      <rect x="18" y="3" width="1" height="10" fill="#141414" />
      <rect x="4" y="2" width="1" height="1" fill="#2a2a2a" />
      <rect x="15" y="2" width="1" height="1" fill="#2a2a2a" />
      {/* fuzz / bristles */}
      <rect x="0" y="6" width="2" height="1" fill="#0a0a0a" />
      <rect x="0" y="9" width="2" height="1" fill="#0a0a0a" />
      <rect x="18" y="6" width="2" height="1" fill="#0a0a0a" />
      <rect x="18" y="9" width="2" height="1" fill="#0a0a0a" />

      {/* small upper eyes */}
      <rect x="5" y="4" width="2" height="2" fill="var(--eye)" />
      <rect x="13" y="4" width="2" height="2" fill="var(--eye)" />

      {/* main eyes — the pulsing focal point */}
      <g className={pulse ? 'avatar-eye-pulse' : undefined}>
        <rect x="4" y="8" width="4" height="4" fill="var(--eye)" />
        <rect x="12" y="8" width="4" height="4" fill="var(--eye)" />
        <rect x="5" y="9" width="2" height="2" fill="var(--eye-glow)" />
        <rect x="13" y="9" width="2" height="2" fill="var(--eye-glow)" />
      </g>

      {/* fangs */}
      <rect x="8" y="13" width="1" height="3" fill="#0a0a0a" />
      <rect x="11" y="13" width="1" height="3" fill="#0a0a0a" />
      <rect x="8" y="16" width="1" height="1" fill="var(--eye)" />
      <rect x="11" y="16" width="1" height="1" fill="var(--eye)" />
    </svg>
  )
}
