"use client"

import { PacoteCredito } from "@/types"
import { formatBRL, formatCreditos } from "@/lib/creditos"

interface Props {
  pacote: PacoteCredito
  /** % mais barato por crédito em relação ao menor pacote. */
  economia: number
  /** Quantas publicações de anúncio o pacote cobre. */
  publicacoes: number | null
  selecionado: boolean
  onSelecionar: (pacote: PacoteCredito) => void
}

/** Opção de pacote em uma lista de seleção única (radiogroup). */
export default function PacoteCard({ pacote, economia, publicacoes, selecionado, onSelecionar }: Props) {
  const precoPorCredito = parseFloat(pacote.preco) / pacote.total_creditos

  return (
    <label
      htmlFor={`pacote-${pacote.id}`}
      className={`relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3.5 cursor-pointer transition-colors
        ${selecionado ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <input
        type="radio"
        id={`pacote-${pacote.id}`}
        name="pacote"
        value={pacote.id}
        checked={selecionado}
        onChange={() => onSelecionar(pacote)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`w-4 h-4 rounded-full border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2
          ${selecionado ? "border-blue-700" : "border-slate-300 bg-white"}`}
      >
        <span className={`w-2 h-2 rounded-full bg-blue-700 transition-transform ${selecionado ? "scale-100" : "scale-0"}`} />
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-slate-900">{pacote.nome}</span>
          <span className="text-sm text-slate-700 tabular-nums">{formatCreditos(pacote.total_creditos)} créditos</span>
        </span>
        <span className="block text-xs text-slate-500 mt-0.5 tabular-nums">
          {pacote.bonus_creditos > 0
            ? `${formatCreditos(pacote.quantidade_creditos)} + ${formatCreditos(pacote.bonus_creditos)} de bônus · `
            : ""}
          {publicacoes !== null && `cobre ${formatCreditos(publicacoes)} ${publicacoes === 1 ? "publicação" : "publicações"}`}
        </span>
      </span>

      <span className="text-right">
        <span className="block text-base font-semibold text-slate-900 tabular-nums">{formatBRL(pacote.preco)}</span>
        <span className="block text-xs tabular-nums text-slate-500">
          {formatBRL(precoPorCredito.toFixed(2))}/crédito
          {economia > 0 && <span className="text-emerald-700"> · −{economia}%</span>}
        </span>
      </span>
    </label>
  )
}
