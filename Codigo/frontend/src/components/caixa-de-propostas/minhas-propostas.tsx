"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, SendHorizontal, Loader2, X, XCircle, Tag, CheckCircle2, Clock, Ban, Building2, MapPin, DollarSign, FileText, Mail, Phone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import servicesUpdateNegociacao from "@/server/(PUT)-negociacao"
import { Negociacao } from "@/types"
import { AuthManager } from "@/lib/AuthManager"

export function PropostasTab() {
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState("Todas")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedNegociacao, setSelectedNegociacao] = useState<Negociacao | null>(null)
  const ITEMS_PER_PAGE = 3

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

  const propostasMinhas = useMemo(() => {
    // Minhas Negociações = sou o comprador, ordernadas por data decrescente
    return negociacoes
      .filter(n => n.comprador === myUserId)
      .sort((a, b) => {
        const dateA = new Date(a.data_resposta || a.data_proposta).getTime()
        const dateB = new Date(b.data_resposta || b.data_proposta).getTime()
        return dateB - dateA
      })
  }, [negociacoes, myUserId])

  const propostasFiltradas = useMemo(() => {
    return propostasMinhas.filter((n) => {
      if (filtroStatus === "Todas") return true;
      if (filtroStatus === "Aguardando" && n.status === "P") return true;
      if (filtroStatus === "Aprovada" && n.status === "A") return true;
      if (filtroStatus === "Recusada" && n.status === "R") return true;
      if (filtroStatus === "Cancelada" && n.status === "C") return true;
      return false;
    });
  }, [propostasMinhas, filtroStatus])

  const totalPages = Math.ceil(propostasFiltradas.length / ITEMS_PER_PAGE)
  const paginatedPropostas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return propostasFiltradas.slice(start, start + ITEMS_PER_PAGE)
  }, [propostasFiltradas, currentPage, ITEMS_PER_PAGE])

  async function cancelarProposta(negociacao: Negociacao) {
    const result = await servicesUpdateNegociacao(negociacao.id, { status: "C" })
    if (!(result as any)?.isError) window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-blue-900 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando histórico...</p>
      </div>
    )
  }

  const FILTERS = [
    { label: "Todas", count: propostasMinhas.length, icon: null },
    { label: "Aguardando", count: propostasMinhas.filter(p => p.status === "P").length, icon: Clock },
    { label: "Aprovada", count: propostasMinhas.filter(p => p.status === "A").length, icon: CheckCircle2 },
    { label: "Recusada", count: propostasMinhas.filter(p => p.status === "R").length, icon: Ban },
    { label: "Cancelada", count: propostasMinhas.filter(p => p.status === "C").length, icon: Ban },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Interno */}
      <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Propostas Enviadas</h2>
          <p className="text-sm text-slate-500 mt-1">Acompanhe o status dos lances que você realizou.</p>
        </div>

        {/* Filtros */}
        {propostasMinhas.length > 0 && (
          <div className="flex flex-wrap bg-slate-100/80 p-1 rounded-xl">
            {FILTERS.map((f) => {
              const isActive = filtroStatus === f.label;
              const Icon = f.icon;
              return (
                <button
                  key={f.label}
                  onClick={() => {
                    setFiltroStatus(f.label)
                    setCurrentPage(1)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {Icon && <Icon size={14} className={isActive ? "text-blue-900" : ""} />}
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
                  }`}>
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {propostasFiltradas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100">
            <SendHorizontal className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-bold text-xl text-slate-700 mb-2">Sem histórico</h3>
          <p className="text-slate-500 text-base max-w-md">
            {filtroStatus === "Todas" 
              ? "Você ainda não enviou propostas para anúncios de outros usuários."
              : `Nenhuma proposta com o status "${filtroStatus}" encontrada.`}
          </p>
          {filtroStatus !== "Todas" && (
            <button 
              onClick={() => {
                setFiltroStatus("Todas")
                setCurrentPage(1)
              }}
              className="mt-6 px-5 py-2 bg-blue-50 text-blue-900 font-semibold rounded-xl hover:bg-blue-100 transition-colors"
            >
              Ver todas as propostas
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-slate-100">
            {paginatedPropostas.map((negociacao) => {
              const nomeMaterial = negociacao.anuncio_nome ?? "Material não identificado"
              const valorExibido = negociacao.val_proposta || negociacao.anuncio_val_base

              // Configurações visuais baseadas no status
              let statusConfig = {
                badgeBg: "bg-amber-50",
                badgeBorder: "border-amber-200",
                badgeText: "text-amber-700",
                icon: <Clock size={12} className="mr-1.5" />,
                label: "AGUARDANDO",
                rowBg: "hover:bg-amber-50/20"
              }

              if (negociacao.status === "A") {
                statusConfig = {
                  badgeBg: "bg-emerald-50",
                  badgeBorder: "border-emerald-200",
                  badgeText: "text-emerald-700",
                  icon: <CheckCircle2 size={12} className="mr-1.5" />,
                  label: "APROVADA",
                  rowBg: "hover:bg-emerald-50/20"
                }
              } else if (negociacao.status === "R") {
                statusConfig = {
                  badgeBg: "bg-rose-50",
                  badgeBorder: "border-rose-200",
                  badgeText: "text-rose-700",
                  icon: <Ban size={12} className="mr-1.5" />,
                  label: "RECUSADA",
                  rowBg: "hover:bg-rose-50/20"
                }
              } else if (negociacao.status === "C") {
                statusConfig = {
                  badgeBg: "bg-slate-50",
                  badgeBorder: "border-slate-200",
                  badgeText: "text-slate-600",
                  icon: <Ban size={12} className="mr-1.5" />,
                  label: "CANCELADA",
                  rowBg: "hover:bg-slate-50/20"
                }
              }

              return (
                <li 
                  key={negociacao.id} 
                  onClick={() => setSelectedNegociacao(negociacao)}
                  className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 transition-colors ${statusConfig.rowBg} cursor-pointer`}
                >
                  {/* Left info */}
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                    <div className="hidden md:flex mt-1 w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-white items-center justify-center shrink-0 border border-slate-200 transition-colors">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID #{negociacao.anuncio}</span>
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.badgeBg} ${statusConfig.badgeBorder} ${statusConfig.badgeText}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-800 truncate pr-4">{nomeMaterial}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mt-2">
                        <span className="flex items-center gap-2 text-slate-600">
                          <Tag size={14} className="text-slate-400" />
                          <span className="font-medium">
                            <span className="text-slate-400 mr-1 text-xs uppercase tracking-wider">Disp:</span> {negociacao.anuncio_qtd} un. 
                            <span className="mx-2 text-slate-300">|</span> 
                            <span className="text-blue-900/70 mr-1 text-xs uppercase tracking-wider font-bold">Solicitado:</span> <span className="text-blue-900 font-black">{negociacao.qtd_proposta || negociacao.anuncio_qtd} un.</span>
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-slate-500">
                          <Calendar size={14} className="text-slate-400" />
                          <span>Enviada em {new Date(negociacao.data_proposta).toLocaleDateString('pt-BR')}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right actions / pricing */}
                  <div className="flex items-center justify-between md:justify-end gap-8 pl-0 md:pl-6 md:border-l border-slate-100">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Seu Lance (Total p/ {negociacao.qtd_proposta || negociacao.anuncio_qtd} un.)
                      </span>
                      <span className={`font-black text-2xl tracking-tight ${negociacao.status === "A" ? "text-emerald-600" : "text-slate-800"}`}>
                        {Number(valorExibido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 w-12 justify-end">
                      {negociacao.status === 'P' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelarProposta(negociacao);
                          }} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                          title="Cancelar minha proposta"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
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

      {/* Modal de Detalhes da Proposta */}
      <Dialog open={!!selectedNegociacao} onOpenChange={(open) => !open && setSelectedNegociacao(null)}>
        {selectedNegociacao && (
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-white text-xl font-black mb-1">
                  Detalhes da Negociação
                </DialogTitle>
                <div className="text-blue-200 text-sm font-medium flex items-center gap-2">
                  ID: #{selectedNegociacao.anuncio}
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
                        <span className="font-semibold">{selectedNegociacao.vendedor_nome || "Vendedor Oculto"}</span>
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
                    <p className="font-semibold text-slate-800">{Number(selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-blue-50/50">
                    <p className="text-[11px] font-bold text-blue-900/60 uppercase tracking-wider mb-1">
                      Lance Total (p/ {selectedNegociacao.qtd_proposta || selectedNegociacao.anuncio_qtd} un.)
                    </p>
                    <p className="font-bold text-blue-900 text-lg">
                      {Number(selectedNegociacao.val_proposta || selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-start">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    {selectedNegociacao.status === "P" && <span className="text-amber-600 font-bold text-sm bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">Aguardando</span>}
                    {selectedNegociacao.status === "A" && <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">Aprovada</span>}
                    {selectedNegociacao.status === "R" && <span className="text-rose-600 font-bold text-sm bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">Recusada</span>}
                    {selectedNegociacao.status === "C" && <span className="text-slate-600 font-bold text-sm bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">Cancelada</span>}
                  </div>
                </div>

                {/* Contatos (Visível apenas se Aprovada) */}
                {selectedNegociacao.status === "A" && (
                  <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-sm p-5">
                    <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      Dados de Contato para o Vendedor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                        <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">E-mail</p>
                          <p className="text-sm font-semibold text-slate-700">{selectedNegociacao.vendedor_email || "Não disponível"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                        <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Telefone</p>
                          <p className="text-sm font-semibold text-slate-700">{selectedNegociacao.vendedor_telefone || "Não disponível"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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