"use client"

import { ArrowDownLeft, ArrowUpRight, Clock, Gift, RotateCcw } from "lucide-react"
import { TransacaoCredito } from "@/types"
import { formatBRL, formatCreditos, formatDataHora } from "@/lib/creditos"

/** Ícone neutro por tipo de movimentação; a cor fica só no valor. */
export const ICONE_TIPO = { C: ArrowDownLeft, D: ArrowUpRight, E: RotateCcw, B: Gift, X: Clock } as const

interface Props {
  transacao: TransacaoCredito
  compact?: boolean
  index?: number
}

/** Linha de movimentação usada no resumo do perfil. */
export default function ExtratoItem({ transacao: t, compact = false }: Props) {
  const Icon = ICONE_TIPO[t.tipo]

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <span className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
        <Icon size={16} aria-hidden="true" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{t.descricao}</p>
        <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
          <span className="tabular-nums">{formatDataHora(t.data_transacao)}</span>
          {!compact && t.metodo_pagamento_display && <span>· {t.metodo_pagamento_display}</span>}
          {!compact && t.valor_pago && <span className="tabular-nums">· {formatBRL(t.valor_pago)}</span>}
          {t.status !== "A" && <span className={t.status === "P" ? "text-amber-700" : "text-red-700"}>· {t.status_display}</span>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold tabular-nums ${t.is_entrada ? "text-emerald-700" : "text-slate-900"}`}>
          {t.is_entrada ? "+" : "−"}{formatCreditos(t.quantidade)}
        </p>
        {!compact && <p className="text-xs text-slate-500 tabular-nums mt-0.5">saldo {formatCreditos(t.saldo_apos)}</p>}
      </div>
    </li>
  )
}
