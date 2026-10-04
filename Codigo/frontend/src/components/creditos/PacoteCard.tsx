"use client"

import { Check, Crown, Gift } from "lucide-react"
import { PacoteCredito } from "@/types"
import CreditoCoin from "@/components/creditos/CreditoCoin"
import { formatBRL, formatCreditos } from "@/lib/creditos"

interface Props {
  pacote: PacoteCredito
  economia: number
  index: number
  onComprar: (pacote: PacoteCredito) => void
}

export default function PacoteCard({ pacote, economia, index, onComprar }: Props) {
  const precoPorCredito = parseFloat(pacote.preco) / pacote.total_creditos
  const destaque = pacote.destaque

  return (
    <div
      className={`animate-credit-rise relative rounded-[28px] p-[2px] transition-all duration-500 hover:-translate-y-1.5 group
        ${destaque ? "shadow-[0_20px_50px_-12px_rgba(37,99,235,0.45)]" : "shadow-sm hover:shadow-xl"}`}
      style={{
        animationDelay: `${index * 80}ms`,
        background: destaque
          ? "linear-gradient(150deg, #fbbf24, #f59e0b 30%, #2563eb 70%, #1e3a8a)"
          : "linear-gradient(150deg, #e2e8f0, #e2e8f0)",
      }}
    >
      {destaque && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-blue-950 shadow-lg whitespace-nowrap"
          style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)" }}
        >
          <Crown size={12} strokeWidth={3} /> Mais popular
        </div>
      )}

      <div className="relative h-full rounded-[26px] bg-white p-6 flex flex-col overflow-hidden">
        <div className={`absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl transition-opacity duration-500 ${destaque ? "bg-amber-300/30 opacity-100" : "bg-blue-300/20 opacity-0 group-hover:opacity-100"}`} />

        <div className="relative flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{pacote.nome}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed min-h-[32px]">{pacote.descricao}</p>
          </div>
          {economia > 0 && (
            <span className="shrink-0 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-emerald-100">
              −{economia}%
            </span>
          )}
        </div>

        <div className="relative mt-6 flex items-center gap-3">
          <CreditoCoin size={46} className="shrink-0 group-hover:rotate-[20deg] transition-transform duration-700 drop-shadow-[0_4px_10px_rgba(245,158,11,0.35)]" />
          <div>
            <p className="text-3xl font-black text-slate-900 tabular-nums leading-none tracking-tight">
              {formatCreditos(pacote.total_creditos)}
            </p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">créditos</p>
          </div>
        </div>

        <div className="relative mt-4 min-h-[28px]">
          {pacote.bonus_creditos > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold ring-1 ring-violet-100">
              <Gift size={13} /> {formatCreditos(pacote.quantidade_creditos)} + {formatCreditos(pacote.bonus_creditos)} de bônus
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Check size={13} /> Sem prazo de expiração
            </span>
          )}
        </div>

        <div className="relative mt-6 pt-5 border-t border-dashed border-slate-200">
          <p className="text-3xl font-black text-slate-900 tracking-tight">{formatBRL(pacote.preco)}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {formatBRL(precoPorCredito.toFixed(2))} por crédito
          </p>
        </div>

        <button
          type="button"
          id={`comprar-pacote-${pacote.id}`}
          onClick={() => onComprar(pacote)}
          className={`relative mt-6 w-full rounded-xl py-3 text-sm font-extrabold transition-all duration-300 cursor-pointer active:scale-[0.97]
            ${destaque
              ? "credit-shine text-blue-950 hover:brightness-105"
              : "bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-100 hover:border-blue-600"
            }`}
          style={destaque ? { background: "linear-gradient(135deg, #fde68a, #fbbf24 50%, #f59e0b)", boxShadow: "0 10px 24px -6px rgba(245,158,11,0.55)" } : undefined}
        >
          Comprar pacote
        </button>
      </div>
    </div>
  )
}
