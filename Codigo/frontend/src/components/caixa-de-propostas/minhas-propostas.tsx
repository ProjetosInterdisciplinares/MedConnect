"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, SendHorizontal, Loader2, XCircle, Tag, CheckCircle2, Clock, Ban } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { BOTAO, ModalPadrao, Resumo } from "@/components/ui/modal-padrao"
import AndamentoNegociacao from "@/components/caixa-de-propostas/AndamentoNegociacao"
import BotaoWhatsApp from "@/components/caixa-de-propostas/BotaoWhatsApp"
import { quantidadeComUnidade } from "@/lib/format/unidade"
import { formatarPrazo } from "@/lib/whatsapp"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import servicesUpdateNegociacao from "@/server/(PUT)-negociacao"
import { Negociacao } from "@/types"
import { AuthManager } from "@/lib/AuthManager"

/** Rótulo do filtro → código do status ("Todas" não filtra). */
const STATUS_DO_FILTRO: Record<string, string | undefined> = {
  Aguardando: "P", Aceita: "A", "Concluída": "F", "Não concluída": "N",
  Recusada: "R", Cancelada: "C", Expirada: "E",
}

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
    const codigo = STATUS_DO_FILTRO[filtroStatus]
    return codigo ? propostasMinhas.filter((n) => n.status === codigo) : propostasMinhas
  }, [propostasMinhas, filtroStatus])

  function atualizar(atualizada: Negociacao) {
    setNegociacoes((lista) => lista.map((n) => (n.id === atualizada.id ? atualizada : n)))
    setSelectedNegociacao(atualizada)
  }

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

  const ICONES: Record<string, typeof Clock | null> = {
    Todas: null, Aguardando: Clock, Aceita: CheckCircle2, "Concluída": CheckCircle2,
    "Não concluída": Ban, Recusada: Ban, Cancelada: Ban, Expirada: Clock,
  }
  const FILTERS = Object.keys(ICONES).map((label) => ({
    label,
    icon: ICONES[label],
    count: STATUS_DO_FILTRO[label] ? propostasMinhas.filter((p) => p.status === STATUS_DO_FILTRO[label]).length : propostasMinhas.length,
  }))

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
          <div className="w-full sm:w-56">
            <Select
              value={filtroStatus}
              onValueChange={(v) => {
                setFiltroStatus(String(v || "Todas"))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger
                aria-label="Filtrar por status"
                className="h-10 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="truncate">
                  <span className="text-slate-500">Status:</span> {filtroStatus}
                  <span className="ml-1.5 text-slate-400 tabular-nums">
                    ({FILTERS.find((f) => f.label === filtroStatus)?.count ?? 0})
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => {
                  const Icon = f.icon
                  return (
                    <SelectItem key={f.label} value={f.label}>
                      <span className="flex w-full items-center gap-2">
                        {Icon && <Icon size={14} className="text-slate-400" aria-hidden="true" />}
                        <span className="flex-1">{f.label}</span>
                        <span className="text-xs text-slate-400 tabular-nums">{f.count}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
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
                badgeBg: "bg-warning-subtle",
                badgeBorder: "border-warning-border",
                badgeText: "text-warning",
                icon: <Clock size={12} className="mr-1.5" />,
                label: "AGUARDANDO",
                rowBg: "hover:bg-warning-subtle/20"
              }

              if (negociacao.status === "A" || negociacao.status === "F") {
                statusConfig = {
                  badgeBg: "bg-success-subtle",
                  badgeBorder: "border-success-border",
                  badgeText: "text-success",
                  icon: <CheckCircle2 size={12} className="mr-1.5" />,
                  label: negociacao.status === "F" ? "CONCLUÍDA" : "ACEITA",
                  rowBg: "hover:bg-success-subtle/20"
                }
              } else if (negociacao.status === "E" || negociacao.status === "N") {
                statusConfig = {
                  badgeBg: "bg-surface-muted",
                  badgeBorder: "border-border",
                  badgeText: "text-muted",
                  icon: <Ban size={12} className="mr-1.5" />,
                  label: negociacao.status === "E" ? "EXPIRADA" : "NÃO CONCLUÍDA",
                  rowBg: "hover:bg-surface-subtle"
                }
              } else if (negociacao.status === "R") {
                statusConfig = {
                  badgeBg: "bg-danger-subtle",
                  badgeBorder: "border-danger-border",
                  badgeText: "text-danger",
                  icon: <Ban size={12} className="mr-1.5" />,
                  label: "RECUSADA",
                  rowBg: "hover:bg-danger-subtle/20"
                }
              } else if (negociacao.status === "C") {
                statusConfig = {
                  badgeBg: "bg-surface-muted",
                  badgeBorder: "border-border",
                  badgeText: "text-muted",
                  icon: <Ban size={12} className="mr-1.5" />,
                  label: "CANCELADA",
                  rowBg: "hover:bg-surface-subtle"
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
                      {negociacao.status === "P" && formatarPrazo(negociacao.prazo_resposta) && (
                        <p className="mt-0.5 text-xs text-slate-500">O vendedor tem até {formatarPrazo(negociacao.prazo_resposta)} para responder.</p>
                      )}
                      {negociacao.status === "A" && (
                        <p className="mt-0.5 text-xs font-medium text-emerald-700">Contato do vendedor liberado. Abra para conversar pelo WhatsApp.</p>
                      )}

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

                    <div className="flex items-center gap-1.5 min-w-12 justify-end">
                      {negociacao.status === "A" && <BotaoWhatsApp negociacao={negociacao} papel="comprador" compacto />}
                      {negociacao.status === 'P' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelarProposta(negociacao);
                          }} 
                          className="p-2 text-slate-400 hover:text-danger hover:bg-danger-subtle rounded-lg transition-all" 
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

      {/* Detalhes da proposta (padrão MedConnect) */}
      <ModalPadrao
        open={!!selectedNegociacao}
        onOpenChange={(open) => !open && setSelectedNegociacao(null)}
        largura="lg"
        titulo="Minha proposta"
        descricao={selectedNegociacao ? `${selectedNegociacao.anuncio_nome ?? "Insumo não identificado"} · Anúncio #${selectedNegociacao.anuncio}` : undefined}
        acoes={
          <>
            {selectedNegociacao?.status === "P" && (
              <button type="button" onClick={() => cancelarProposta(selectedNegociacao)} className={BOTAO.secundario}>
                Cancelar proposta
              </button>
            )}
            <button type="button" onClick={() => setSelectedNegociacao(null)} className={BOTAO.secundario}>Fechar</button>
          </>
        }
      >
        {selectedNegociacao && (() => {
          const n = selectedNegociacao
          const brl = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          return (
            <div className="space-y-5">
              <Resumo itens={[
                ["Vendedor", n.vendedor_nome || "—"],
                ["Quantidade", quantidadeComUnidade(Number(n.qtd_proposta || n.anuncio_qtd || 0), n.anuncio_unidade)],
                ["Valor anunciado", brl(n.anuncio_val_base)],
                ["Sua proposta", <span key="v" className="font-semibold">{brl(n.val_proposta)}</span>],
                ["Enviada em", new Date(n.data_proposta).toLocaleDateString("pt-BR")],
                ["Situação", n.status_display || n.status],
              ]} />

              {n.status === "P" && formatarPrazo(n.prazo_resposta) && (
                <p className="text-sm text-slate-600">
                  O vendedor tem até <strong className="font-semibold text-slate-900">{formatarPrazo(n.prazo_resposta)}</strong> para responder.
                  Se não responder, a proposta expira e o anúncio volta ao catálogo.
                </p>
              )}
              {n.status === "R" && (
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-900">Motivo da recusa</p>
                  <p className="mt-0.5 text-slate-600">
                    {n.motivo_recusa_display || "Não informado"}{n.detalhe_recusa ? `: ${n.detalhe_recusa}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Se o anúncio ainda estiver no catálogo, você pode enviar uma nova proposta.</p>
                </div>
              )}
              {n.status === "E" && (
                <p className="text-sm text-slate-600">O vendedor não respondeu no prazo. O anúncio voltou ao catálogo e você pode enviar uma nova proposta.</p>
              )}
              {["A", "F", "N"].includes(n.status) && (
                <AndamentoNegociacao negociacao={n} papel="comprador" onAtualizada={atualizar} />
              )}
            </div>
          )
        })()}
      </ModalPadrao>
    </div>
  )
}