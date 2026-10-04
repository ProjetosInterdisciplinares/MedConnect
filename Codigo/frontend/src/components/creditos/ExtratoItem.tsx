"use client"

import { ArrowDownLeft, ArrowUpRight, Gift, RotateCcw } from "lucide-react"
import { TransacaoCredito } from "@/types"
import { formatBRL, formatCreditos, formatDataHora } from "@/lib/creditos"

const ESTILOS_TIPO = {
  C: { icon: ArrowDownLeft, bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100" },
  D: { icon: ArrowUpRight, bg: "bg-rose-50", fg: "text-rose-600", ring: "ring-rose-100" },
  E: { icon: RotateCcw, bg: "bg-sky-50", fg: "text-sky-600", ring: "ring-sky-100" },
  B: { icon: Gift, bg: "bg-violet-50", fg: "text-violet-600", ring: "ring-violet-100" },
} as const

interface Props {
  transacao: TransacaoCredito
  compact?: boolean
  index?: number
}

export default function ExtratoItem({ transacao: t, compact = false, index = 0 }: Props) {
  const estilo = ESTILOS_TIPO[t.tipo]
  const Icon = estilo.icon

  return (
    <li
      className="animate-credit-rise flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-2xl hover:bg-slate-50 transition-colors"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <div className={`shrink-0 w-10 h-10 rounded-xl ${estilo.bg} ${estilo.fg} ring-1 ${estilo.ring} flex items-center justify-center`}>
        <Icon size={18} strokeWidth={2.4} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{t.descricao}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5 flex flex-wrap items-center gap-x-2">
          <span>{formatDataHora(t.data_transacao)}</span>
          {!compact && t.metodo_pagamento_display && (
            <>
              <span className="text-slate-300">•</span>
              <span>{t.metodo_pagamento_display}</span>
            </>
          )}
          {!compact && t.valor_pago && (
            <>
              <span className="text-slate-300">•</span>
              <span>{formatBRL(t.valor_pago)}</span>
            </>
          )}
          {t.status !== "A" && (
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${t.status === "P" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
              {t.status_display}
            </span>
          )}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-extrabold tabular-nums ${t.is_entrada ? "text-emerald-600" : "text-rose-600"}`}>
          {t.is_entrada ? "+" : "−"}{formatCreditos(t.quantidade)}
        </p>
        {!compact && (
          <p className="text-[11px] text-slate-400 font-medium tabular-nums mt-0.5">
            saldo {formatCreditos(t.saldo_apos)}
          </p>
        )}
      </div>
    </li>
  )
}
