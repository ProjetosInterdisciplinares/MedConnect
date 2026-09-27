"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Package, Inbox, Loader2, Eye, TrendingDown, CheckCircle2, XCircle, Building2, Tag, Info, ArrowRight } from "lucide-react"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import servicesUpdateNegociacao from "@/server/(PUT)-negociacao"
import { Negociacao } from "@/types"
import { AuthManager } from "@/lib/AuthManager"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function NegociacaoTab() {
  const router = useRouter()
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null)
  
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successAction, setSuccessAction] = useState<"ACEITO" | "RECUSADO" | null>(null)
  const [successValue, setSuccessValue] = useState<number>(0)
  
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const myUserId = typeof window !== 'undefined' ? Number(AuthManager.getInstance().getUserId()) : 0

  useEffect(() => {
    async function load() {
      const negociacoesResult = await servicesGetNegociacoes()
      const listaNegociacoes = Array.isArray(negociacoesResult) ? negociacoesResult : (negociacoesResult as any)?.data || []
      
      setNegociacoes(listaNegociacoes)
      setLoading(false)
    }
    load()
  }, [])

  const itensFiltrados = useMemo(() => {
    return negociacoes.filter((n) => n.vendedor === myUserId && n.status === "P")
  }, [negociacoes, myUserId])

  const totalPages = Math.ceil(itensFiltrados.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return itensFiltrados.slice(start, start + ITEMS_PER_PAGE)
  }, [itensFiltrados, currentPage])

  async function aceitarProposta(negociacao: Negociacao) {
    const result = await servicesUpdateNegociacao(negociacao.id, { status: "A" })
    if (!(result as any)?.isError) {
      setSuccessAction("ACEITO")
      setSuccessValue(Number(negociacao.val_proposta || negociacao.anuncio_val_base || 0))
      setIsSuccessOpen(true)
      setNegociacoes(prev => prev.filter(n => n.id !== negociacao.id))
    }
  }

  async function recusarProposta(negociacao: Negociacao) {
    const result = await servicesUpdateNegociacao(negociacao.id, { status: "R" })
    if (!(result as any)?.isError) {
      setSuccessAction("RECUSADO")
      setIsSuccessOpen(true)
      setNegociacoes(prev => prev.filter(n => n.id !== negociacao.id))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-blue-900 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando propostas...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Interno */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Propostas Recebidas</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie os lances e ofertas para os seus insumos anunciados.</p>
        </div>
        <div className="bg-blue-50 text-blue-950 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 shadow-inner">
          {itensFiltrados.length} Pendente{itensFiltrados.length !== 1 && 's'}
        </div>
      </div>

      {itensFiltrados.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100">
            <Inbox className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-bold text-xl text-slate-700 mb-2">Caixa Vazia</h3>
          <p className="text-slate-500 text-base max-w-md">
            Você ainda não tem novas propostas para analisar. Quando alguém fizer um lance nos seus anúncios, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-slate-100">
            {paginatedItems.map((negociacao) => {
              const nomeMaterial = negociacao.anuncio_nome ?? "Material não identificado"
              const valBase = Number(negociacao.anuncio_val_base || 0)
              const valProposta = Number(negociacao.val_proposta || 0)
              const isDesconto = valProposta < valBase

              return (
                <li key={negociacao.id} className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-blue-50/30 transition-colors">
                  {/* Left info */}
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                    <div className="hidden md:flex mt-1 w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-100 items-center justify-center shrink-0 border border-slate-200 group-hover:border-blue-200 transition-colors">
                      <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-900 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Anúncio #{negociacao.anuncio}</span>
                        {isDesconto && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <TrendingDown size={12} /> Desconto Solicitado
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg text-slate-800 truncate pr-4">{nomeMaterial}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mt-2">
                        <span className="flex items-center gap-2 text-slate-600">
                          <Tag size={14} className="text-slate-400" />
                          <span className="font-medium">Qtd: {negociacao.qtd_proposta || negociacao.anuncio_qtd || 0}</span>
                        </span>
                        {negociacao.comprador && (
                          <span className="flex items-center gap-2 text-slate-600">
                            <Building2 size={14} className="text-slate-400" />
                            <span className="font-medium text-blue-950">
                              {negociacao.comprador_nome || `Comprador #${negociacao.comprador}`}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right actions / pricing */}
                  <div className="flex items-center justify-between md:justify-end gap-8 pl-0 md:pl-6 md:border-l border-slate-100">
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-medium text-slate-400 line-through mb-1">
                        De: {valBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="text-slate-800 font-black text-xl tracking-tight">
                        {valProposta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setSelectedNegociacao(negociacao)}
                        className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all"
                        title="Analisar proposta"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => aceitarProposta(negociacao)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Aceitar rapidamente">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => recusarProposta(negociacao)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Recusar">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
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

      {/* Detalhes da Proposta Dialog */}
      <Dialog open={!!selectedNegociacao} onOpenChange={(open) => !open && setSelectedNegociacao(null)}>
        {selectedNegociacao && (
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950">
              <DialogTitle className="flex items-center justify-between text-xl font-black text-white">
                Análise de Proposta
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                  Anúncio #{selectedNegociacao.anuncio}
                </span>
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-2">
                Confira as condições propostas pelo comprador antes de tomar sua decisão.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Resumo do Pedido */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-blue-900">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 mb-1">{selectedNegociacao.anuncio_nome}</h4>
                    <div className="flex gap-6 text-sm text-slate-600">
                      <div><span className="text-slate-400 mr-1">Quantidade:</span><span className="font-semibold">{selectedNegociacao.qtd_proposta || selectedNegociacao.anuncio_qtd}</span></div>
                      {selectedNegociacao.anuncio_lote && (
                        <div><span className="text-slate-400 mr-1">Lote:</span><span className="font-semibold">{selectedNegociacao.anuncio_lote}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Valores Comparativos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200" />
                  <p className="text-xs uppercase font-bold text-slate-400 mb-1 pl-2">Valor Base</p>
                  <p className="font-semibold text-xl text-slate-500 line-through pl-2">
                    {Number(selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                
                <div className="bg-blue-900 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-800 rounded-full blur-2xl opacity-50 pointer-events-none" />
                  <p className="text-xs uppercase font-bold text-blue-100 mb-1 relative z-10">Valor Proposto</p>
                  <p className="font-black text-3xl text-white tracking-tight relative z-10 flex items-center justify-between">
                    {Number(selectedNegociacao.val_proposta || selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {(Number(selectedNegociacao.val_proposta) < Number(selectedNegociacao.anuncio_val_base)) && (
                      <TrendingDown className="w-6 h-6 text-emerald-300" />
                    )}
                  </p>
                </div>
              </div>

              {/* Info do Comprador */}
              {(selectedNegociacao.ds_obs || selectedNegociacao.comprador) && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                  {selectedNegociacao.comprador && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs uppercase font-bold text-slate-400 mb-0.5">Comprador Interessado</p>
                        <p className="font-semibold text-slate-700">
                          {selectedNegociacao.comprador_nome || `ID: ${selectedNegociacao.comprador}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedNegociacao.ds_obs && (
                    <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
                      <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs uppercase font-bold text-amber-600/80 mb-0.5">Observações</p>
                        <p className="text-sm text-slate-600 italic leading-relaxed">{selectedNegociacao.ds_obs}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="bg-white px-6 py-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedNegociacao(null)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Voltar
              </button>
              <div className="flex w-full sm:w-auto gap-3">
                <button 
                  onClick={() => { recusarProposta(selectedNegociacao); setSelectedNegociacao(null) }} 
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-white text-rose-600 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Recusar
                </button>
                <button 
                  onClick={() => { aceitarProposta(selectedNegociacao); setSelectedNegociacao(null) }} 
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-950 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group"
                >
                  Aceitar Proposta <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
          <DialogHeader className={`m-0 px-6 py-5 rounded-t-xl border-b ${successAction === "ACEITO" ? "bg-emerald-600 border-emerald-700" : "bg-rose-600 border-rose-700"}`}>
            <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
              {successAction === "ACEITO" ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              {successAction === "ACEITO" ? "Proposta Aceita!" : "Proposta Recusada!"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-sm text-center">
              {successAction === "ACEITO" ? (
                <p className="text-slate-600 text-base">
                  O anúncio foi finalizado com o valor de <br/><strong className="text-2xl mt-2 block text-emerald-700">{successValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </p>
              ) : (
                <p className="text-slate-600 text-base font-medium">
                  A negociação foi recusada e o anúncio voltou ao catálogo.
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSuccessOpen(false)
                  if (successAction === "ACEITO") {
                    router.push("/caixa-de-propostas?tab=finalizados")
                  }
                }}
                className={`px-6 py-3 text-white rounded-xl font-bold transition-colors w-full shadow-lg cursor-pointer ${
                  successAction === "ACEITO" 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20" 
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-900/20"
                }`}
              >
                {successAction === "ACEITO" ? "Ir para Finalizados" : "OK"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}