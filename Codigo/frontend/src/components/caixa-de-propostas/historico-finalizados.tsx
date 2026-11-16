"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, Loader2, CheckCircle2 } from "lucide-react"
import AndamentoNegociacao from "@/components/caixa-de-propostas/AndamentoNegociacao"
import BotaoWhatsApp from "@/components/caixa-de-propostas/BotaoWhatsApp"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import { Negociacao } from "@/types"
import { AuthManager } from "@/lib/AuthManager"
import { quantidadeComUnidade } from "@/lib/format/unidade"
import { BOTAO, ModalPadrao, Resumo } from "@/components/ui/modal-padrao"

const SELO: Record<string, { rotulo: string; classe: string }> = {
  A: { rotulo: "Aguardando conclusão", classe: "bg-amber-50 text-amber-800 border-amber-200" },
  F: { rotulo: "Concluída", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  N: { rotulo: "Não concluída", classe: "bg-slate-100 text-slate-600 border-slate-200" },
}

export function HistoricoFinalizadosTab() {
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null)
  const ITEMS_PER_PAGE = 5

  const myUserId = typeof window !== 'undefined' ? Number(AuthManager.getInstance().getUserId()) : 0

  useEffect(() => {
    async function load() {
      try {
        const result = await servicesGetNegociacoes()
        const lista = Array.isArray(result) ? result : (result as any)?.data || []
        setNegociacoes(lista)
      } catch (error) {
        console.error("Erro ao carregar negociações finalizadas", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Vendas aceitas por mim: aguardando conclusão, concluídas ou não concluídas
  const finalizados = useMemo(() => {
    return negociacoes.filter(n => n.vendedor === myUserId && ["A", "F", "N"].includes(n.status))
  }, [negociacoes, myUserId])

  function atualizar(atualizada: Negociacao) {
    setNegociacoes((lista) => lista.map((n) => (n.id === atualizada.id ? atualizada : n)))
    setSelectedNegociacao(atualizada)
  }

  const totalPages = Math.ceil(finalizados.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return finalizados.slice(start, start + ITEMS_PER_PAGE)
  }, [finalizados, currentPage])

  return (
    <div className="flex flex-col h-full bg-white">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
          <Loader2 className="w-10 h-10 text-blue-900 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando histórico...</p>
        </div>
      ) : finalizados.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100">
            <CheckCircle2 className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-bold text-xl text-slate-700 mb-2">Sem histórico</h3>
          <p className="text-slate-500 text-base max-w-md">
            Quando você aceitar uma proposta, a venda aparece aqui para combinar com o comprador e confirmar a entrega.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {paginatedItems.map((negociacao) => {
              const nomeMaterial = negociacao.anuncio_nome ?? "Material não identificado"
              const valorExibido = negociacao.val_proposta || negociacao.anuncio_val_base

              return (
                <div
                  key={negociacao.id}
                  onClick={() => setSelectedNegociacao(negociacao)}
                  className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer hover:border-blue-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 items-center justify-center shrink-0 border border-slate-100 group-hover:bg-blue-50 transition-colors">
                      <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Anúncio #{negociacao.anuncio}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-slate-800 leading-tight">
                        {nomeMaterial}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mt-2">
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="font-semibold text-slate-700">Qtd vendida:</span>
                          {negociacao.qtd_proposta || negociacao.anuncio_qtd}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {negociacao.data_resposta ? new Date(negociacao.data_resposta).toLocaleDateString('pt-BR') : "—"}
                        </span>

                        {negociacao.comprador_nome && (
                          <span className="flex items-center gap-1.5 text-blue-900 font-medium">
                            Comprador: {negociacao.comprador_nome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                    <span className="text-emerald-600 font-extrabold text-xl">
                      {Number(valorExibido).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>

                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${SELO[negociacao.status]?.classe ?? SELO.A.classe}`}>
                      {SELO[negociacao.status]?.rotulo ?? negociacao.status_display}
                    </span>

                    {negociacao.status === "A" && <BotaoWhatsApp negociacao={negociacao} papel="vendedor" compacto />}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                Página <span className="font-semibold text-slate-700">{currentPage}</span> de <span className="font-semibold text-slate-700">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detalhes da venda (padrão MedConnect) */}
      <ModalPadrao
        open={!!selectedNegociacao}
        onOpenChange={(open) => !open && setSelectedNegociacao(null)}
        largura="lg"
        titulo={selectedNegociacao?.status === "F" ? "Venda concluída" : selectedNegociacao?.status === "N" ? "Venda não concluída" : "Venda aceita"}
        descricao={selectedNegociacao ? `${selectedNegociacao.anuncio_nome ?? "Insumo não identificado"} · Anúncio #${selectedNegociacao.anuncio}` : undefined}
        acoes={<button type="button" onClick={() => setSelectedNegociacao(null)} className={BOTAO.secundario}>Fechar</button>}
      >
        {selectedNegociacao && (() => {
          const n = selectedNegociacao
          const brl = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          const data = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—")
          const quantidade = quantidadeComUnidade(Number(n.qtd_proposta || n.anuncio_qtd || 0), n.anuncio_unidade)
          return (
            <div className="space-y-5">
              <Resumo itens={[
                ["Comprador", n.comprador_nome || "Não identificado"],
                ["Quantidade vendida", quantidade],
                ["Valor anunciado", brl(n.anuncio_val_base)],
                ["Valor da venda", <span key="v" className="font-semibold">{brl(n.val_proposta || n.anuncio_val_base)}</span>],
                ["Proposta enviada em", data(n.data_proposta)],
                ["Proposta aceita em", data(n.data_resposta)],
              ]} />

              <AndamentoNegociacao negociacao={n} papel="vendedor" onAtualizada={atualizar} />
            </div>
          )
        })()}
      </ModalPadrao>
    </div>
  )
}
