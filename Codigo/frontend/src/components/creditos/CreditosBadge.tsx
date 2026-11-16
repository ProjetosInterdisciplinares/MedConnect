"use client"

import Link from "next/link"
import { Coins, Plus } from "lucide-react"
import { formatCreditos } from "@/lib/creditos"

interface Props {
  saldo: number | null
  isActive?: boolean
  /** Variante para fundo claro (barra branca). */
  claro?: boolean
}

/**
 * Saldo de créditos exibido no menu.
 */
export default function CreditosBadge({ saldo, isActive = false, claro = false }: Props) {
  const t = claro
    ? {
        base: isActive ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:bg-slate-50",
        icone: "text-blue-700",
        valor: "text-slate-900",
        rotulo: "text-slate-500",
        skeleton: "bg-slate-200",
        mais: "bg-blue-700 text-white group-hover:bg-blue-800",
      }
    : {
        base: isActive ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10",
        icone: "text-blue-200",
        valor: "text-white",
        rotulo: "text-blue-200/80",
        skeleton: "bg-white/20",
        mais: "bg-white/10 text-white group-hover:bg-white/20",
      }

  return (
    <Link
      href="/creditos"
      id="header-creditos-badge"
      title="Meus créditos: clique para comprar"
      className={`group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg border transition-colors ${t.base}`}
    >
      <Coins className={`w-4 h-4 shrink-0 ${t.icone}`} aria-hidden="true" />

      <span className={`text-sm font-semibold tabular-nums ${t.valor}`}>
        {saldo === null ? (
          <span className={`inline-block w-6 h-3 rounded animate-pulse align-middle ${t.skeleton}`} />
        ) : (
          formatCreditos(saldo)
        )}
        <span className={`ml-1 font-normal ${t.rotulo}`}>créditos</span>
      </span>

      <span className={`flex items-center justify-center w-5 h-5 rounded-md transition-colors ${t.mais}`}>
        <Plus className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
      </span>
    </Link>
  )
}
