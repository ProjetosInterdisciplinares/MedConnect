"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, Loader2, CheckCircle2, Building2, Mail, Phone, DollarSign, Tag } from "lucide-react"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import { Negociacao } from "@/types"
import { AuthManager } from "@/lib/AuthManager"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

  // Negociações finalizadas onde eu sou o vendedor (vendi)
  const finalizados = useMemo(() => {
    return negociacoes.filter(n => n.vendedor === myUserId && n.status === "A")
  }, [negociacoes, myUserId])

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
            Quando você concluir a venda de algum anúncio, ele aparecerá no seu histórico aqui.
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

                    <span className="px-3 py-1.5 text-xs font-bold rounded-full border tracking-wide shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">
                      VENDIDO
                    </span>
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

      {/* Modal de Detalhes da Venda */}
      <Dialog open={!!selectedNegociacao} onOpenChange={(open) => !open && setSelectedNegociacao(null)}>
        {selectedNegociacao && (
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-emerald-700 px-6 py-5 rounded-t-xl border-b border-emerald-800 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-white text-xl font-black mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                  Venda Finalizada
                </DialogTitle>
                <div className="text-emerald-100 text-sm font-medium flex items-center gap-2">
                  Anúncio #{selectedNegociacao.anuncio}
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="flex flex-col gap-6">
                
                {/* Cabeçalho do Anúncio */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                    <Package className="w-10 h-10 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                      {selectedNegociacao.anuncio_nome ?? "Insumo não identificado"}
                    </h2>
                    <div className="flex flex-col gap-1.5 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="font-semibold">{selectedNegociacao.comprador_nome || "Comprador Oculto"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de Informações */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantidade</p>
                    <p className="font-semibold text-slate-800">{selectedNegociacao.qtd_proposta || selectedNegociacao.anuncio_qtd} und.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Valor Base</p>
                    <p className="font-semibold text-slate-800">
                      {Number(selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-emerald-50/50">
                    <p className="text-[11px] font-bold text-emerald-700/60 uppercase tracking-wider mb-1">Valor Vendido</p>
                    <p className="font-bold text-emerald-700 text-lg">
                      {Number(selectedNegociacao.val_proposta || selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-start">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">Vendido</span>
                  </div>
                </div>

                {/* Dados de Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data da Proposta</p>
                      <p className="text-sm font-semibold text-slate-700">{new Date(selectedNegociacao.data_proposta).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Data de Aprovação</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedNegociacao.data_resposta ? new Date(selectedNegociacao.data_resposta).toLocaleDateString('pt-BR') : "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Dados de Contato do Comprador */}
                <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-sm p-5">
                  <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Dados de Contato do Comprador
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                      <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">E-mail</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedNegociacao.comprador_email || "Não disponível"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                      <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Telefone</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedNegociacao.comprador_telefone || "Não disponível"}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedNegociacao(null)}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
