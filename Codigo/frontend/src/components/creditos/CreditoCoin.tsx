"use client"

import { useId } from "react"

interface Props {
  size?: number
  className?: string
}

/**
 * Ícone da moeda "Créditos MedConnect": moeda dourada com a cruz médica.
 */
export default function CreditoCoin({ size = 20, className = "" }: Props) {
  const uid = useId().replace(/:/g, "")
  const face = `coin-face-${uid}`
  const rim = `coin-rim-${uid}`
  const shine = `coin-shine-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={rim} x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
        <radialGradient id={face} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(18 15) rotate(55) scale(30)">
          <stop stopColor="#FEF3C7" />
          <stop offset="0.45" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id={shine} x1="12" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Borda */}
      <circle cx="24" cy="24" r="22" fill={`url(#${rim})`} />
      {/* Face */}
      <circle cx="24" cy="24" r="17.5" fill={`url(#${face})`} />
      <circle cx="24" cy="24" r="17.5" stroke="#92400E" strokeOpacity="0.35" strokeWidth="1" />
      {/* Cruz médica */}
      <path
        d="M20.5 14.5h7v6h6v7h-6v6h-7v-6h-6v-7h6v-6Z"
        fill="#FFFBEB"
        stroke="#B45309"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Reflexo */}
      <path d="M10 20a14 14 0 0 1 12-12" stroke={`url(#${shine})`} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
