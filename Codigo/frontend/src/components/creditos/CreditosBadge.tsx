"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"
import CreditoCoin from "@/components/creditos/CreditoCoin"
import { formatCreditos } from "@/lib/creditos"

interface Props {
  saldo: number | null
  isActive?: boolean
}

/**
 * Pílula de saldo exibida no header (navbar escura).
 * Faz um "pop" sempre que o saldo muda.
 */
export default function CreditosBadge({ saldo, isActive = false }: Props) {
  const [popKey, setPopKey] = useState(0)
  const anterior = useRef<number | null>(null)

  useEffect(() => {
    if (saldo === null) return
    if (anterior.current !== null && anterior.current !== saldo) {
      setPopKey((k) => k + 1)
    }
    anterior.current = saldo
  }, [saldo])

  return (
    <Link
      href="/creditos"
      id="header-creditos-badge"
      title="Meus créditos — clique para comprar"
      className={`group relative flex items-center gap-1 sm:gap-2 px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-full border transition-all duration-300 active:scale-[0.97]
        ${isActive
          ? "bg-white/20 border-white/20"
          : "bg-white/10 border-white/5 hover:bg-white/15 hover:border-white/10"
        }`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <span key={popKey} className="flex items-center justify-center animate-credit-pop">
        <CreditoCoin size={24} className="drop-shadow-[0_0_6px_rgba(251,191,36,0.55)] group-hover:rotate-12 transition-transform duration-500 w-5 h-5 sm:w-6 sm:h-6" />
      </span>

      <span className="flex flex-col leading-none pr-0.5">
        <span className="text-[13px] font-extrabold text-white tabular-nums tracking-tight">
          {saldo === null ? (
            <span className="inline-block w-6 h-3 rounded bg-white/20 animate-pulse align-middle" />
          ) : (
            formatCreditos(saldo)
          )}
        </span>
        <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.12em] text-blue-200/60 mt-0.5 group-hover:text-amber-300/80 transition-colors">
          créditos
        </span>
      </span>

      <span className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 text-blue-950 group-hover:bg-amber-300 group-hover:rotate-90 transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
        <Plus className="w-3 h-3 sm:w-3 sm:h-3" strokeWidth={3.5} />
      </span>
    </Link>
  )
}
