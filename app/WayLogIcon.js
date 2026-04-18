'use client'

// Pin shape: teardrop circle-top / point-bottom
// Circle center ≈ (50, 40) r=35, point at (50, 98)
const PIN = 'M15,40 A35,35 0 1,1 85,40 C85,62 65,80 50,98 C35,80 15,62 15,40 Z'

export default function WayLogIcon({ size = 40, showText = false, instanceId = 'default' }) {
  const clipId = `wl-pin-${instanceId}`
  const iconH = 100        // pin occupies viewBox rows 0-100
  const textH = showText ? 44 : 0
  const vbH = iconH + textH

  return (
    <svg
      width={size}
      height={showText ? size * (vbH / 100) : size}
      viewBox={`0 0 100 ${vbH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Way Log"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={PIN} />
        </clipPath>
      </defs>

      {/* ── Pin background (dark navy) ─────────────────────────────────── */}
      <path d={PIN} fill="#1a3a6b" />

      {/* ── Overlapping filled shapes — clipped to pin ─────────────────── */}
      <g clipPath={`url(#${clipId})`}>
        {/* Teal/cyan sweep — wide ellipse upper-left curving right */}
        <ellipse cx="38" cy="18" rx="46" ry="30"
          fill="#00acc1" opacity="0.88"
          transform="rotate(-12 38 18)" />

        {/* Orange — upper-right bulge */}
        <ellipse cx="72" cy="18" rx="36" ry="30"
          fill="#e64a19" opacity="0.86"
          transform="rotate(22 72 18)" />

        {/* Deep blue — sweeps center-left downward */}
        <ellipse cx="30" cy="52" rx="40" ry="26"
          fill="#1565c0" opacity="0.88"
          transform="rotate(28 30 52)" />

        {/* Mid-blue highlight center */}
        <ellipse cx="46" cy="36" rx="24" ry="16"
          fill="#1e88e5" opacity="0.55"
          transform="rotate(-22 46 36)" />

        {/* Lighter teal highlight top-left */}
        <ellipse cx="28" cy="22" rx="26" ry="16"
          fill="#4dd0e1" opacity="0.45"
          transform="rotate(-5 28 22)" />
      </g>

      {/* ── Swirl outline lines (white arcs on top) ────────────────────── */}
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx="46" cy="36" rx="31" ry="22"
          fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.6"
          transform="rotate(-28 46 36)" />
        <ellipse cx="53" cy="33" rx="28" ry="20"
          fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.3"
          transform="rotate(42 53 33)" />
        <ellipse cx="42" cy="44" rx="24" ry="16"
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.1"
          transform="rotate(12 42 44)" />
      </g>

      {/* ── Pin outline ────────────────────────────────────────────────── */}
      <path d={PIN} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* ── Text (only shown when showText=true) ──────────────────────── */}
      {showText && (
        <>
          <text
            x="50" y={iconH + 20}
            textAnchor="middle"
            fontFamily="-apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="800"
            fontSize="22"
            letterSpacing="2"
            fill="#1a3a6b"
          >
            WAY
          </text>
          <text
            x="50" y={iconH + 40}
            textAnchor="middle"
            fontFamily="-apple-system, 'Segoe UI', Roboto, sans-serif"
            fontWeight="600"
            fontSize="16"
            letterSpacing="3"
            fill="#00838f"
          >
            LOG
          </text>
        </>
      )}
    </svg>
  )
}
