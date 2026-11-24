"use client"

import { useState } from "react"
import { AlertOctagon, ChevronDown, History, Loader2, Sparkles, Trash2 } from "lucide-react"
import { ResumoAnaliseEstoque } from "@/types"
import { fmtData, fmtDataHora, fmtNumero } from "@/components/estoque/rotulos"

interface Props {
  analises: ResumoAnaliseEstoque[]
  carregando: boolean
  selecionada: number | null
  abrindo: number | null
  onAbrir: (id: number) => void
  onExcluir: (analise: ResumoAnaliseEstoque) => void
}

/** Igual a AnaliseEstoque.LIMITE_POR_EMPRESA no backend (estoque_ia/models.py). */
export const LIMITE_HISTORICO = 30
const VISIVEIS_INICIAL = 5

/** Análises salvas: cada uma guarda como o estoque estava no dia do envio. */
export default function HistoricoAnalises({ analises, carregando, selecionada, abrindo, onAbrir, onExcluir }: Props) {
  const [visiveis, setVisiveis] = useState(VISIVEIS_INICIAL)
  // A análise aberta aparece mesmo se estiver além das primeiras da lista
  const posicaoSelecionada = analises.findIndex((a) => a.id === selecionada)
  const limite = Math.max(visiveis, posicaoSelecionada + 1)
  return (
    <section aria-labelledby="titulo-historico" className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 id="titulo-historico" className="font-bold text-slate-800 flex items-center gap-2">
          <History size={17} className="text-blue-900" aria-hidden="true" /> Análises salvas
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Cada análise guarda como o estoque estava no dia do envio. Abra uma para comparar ou para publicar as sugestões que faltam.
        </p>
        <p className="text-[11px] text-slate-400 mt-1.5">
          Ficam salvas as {LIMITE_HISTORICO} mais recentes. Reenviar a mesma planilha substitui a análise anterior.
        </p>
      </div>

      {carregando ? (
        <div className="px-5 py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-400" aria-label="Carregando histórico" /></div>
      ) : analises.length === 0 ? (
        <p className="px-5 pb-6 pt-2 text-sm text-slate-500">Nenhuma análise ainda. A primeira planilha enviada aparece aqui.</p>
      ) : (
        <>
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {analises.slice(0, limite).map((a) => {
            const ativa = selecionada === a.id
            return (
              <li key={a.id} className={`flex items-stretch ${ativa ? "bg-blue-50/70" : "hover:bg-slate-50"}`}>
                <button
                  type="button"
                  onClick={() => onAbrir(a.id)}
                  aria-current={ativa ? "true" : undefined}
                  className="flex-1 min-w-0 text-left px-5 py-3 cursor-pointer"
                >
                  <p className={`text-sm font-semibold truncate ${ativa ? "text-blue-900" : "text-slate-800"}`}>{a.nome_arquivo || "Planilha"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fmtDataHora(a.criado_em)}</p>
                  <p className="text-xs text-slate-500">
                    {fmtData(a.periodo_inicio)} a {fmtData(a.periodo_fim)} · {a.dias_periodo} dias
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold tabular-nums">
                      {fmtNumero(a.total_sugeridos)} sugeridos
                    </span>
                    {a.ia_utilizada && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                        <Sparkles size={10} aria-hidden="true" /> IA
                      </span>
                    )}
                    {a.alertas_criticos > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold">
                        <AlertOctagon size={10} aria-hidden="true" /> {a.alertas_criticos} crítico{a.alertas_criticos > 1 ? "s" : ""}
                      </span>
                    )}
                    {abrindo === a.id && <Loader2 size={12} className="animate-spin text-slate-400" aria-label="Abrindo" />}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onExcluir(a)}
                  aria-label={`Excluir análise de ${fmtDataHora(a.criado_em)}`}
                  className="px-3 text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
        {analises.length > limite && (
          <div className="border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={() => setVisiveis(limite + VISIVEIS_INICIAL)}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 cursor-pointer"
            >
              <ChevronDown size={14} aria-hidden="true" /> Ver mais ({analises.length - limite})
            </button>
          </div>
        )}
        </>
      )}
    </section>
  )
}
