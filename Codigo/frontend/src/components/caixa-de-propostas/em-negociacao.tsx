"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Package, Inbox, Loader2, Eye, TrendingDown, CheckCircle2, XCircle, Building2, Tag, Info, ArrowRight } from "lucide-react"
import servicesGetNegociacoes from "@/server/(GET)-negociacoes"
import servicesUpdateNegociacao from "@/server/(PUT)-negociacao"
import { MotivoRecusa, Negociacao } from "@/types"
import { AuthManager } from "@/lib/AuthManager"
import { unidadeDeVenda } from "@/lib/format/unidade"
import { formatarPrazo, MOTIVOS_RECUSA } from "@/lib/whatsapp"
import { BOTAO, ModalPadrao } from "@/components/ui/modal-padrao"
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
  const [successSaldo, setSuccessSaldo] = useState<{ restante: number; reativado: boolean; unidade: string } | null>(null)

  /* ─── Confirmação do aceite (e do saldo restante, na venda parcial) ─── */
  const [aceitando, setAceitando] = useState<Negociacao | null>(null)
  const [reativarSaldo, setReativarSaldo] = useState(true)
  const [valorSaldo, setValorSaldo] = useState("")
  const [descricaoSaldo, setDescricaoSaldo] = useState("")
  const [descricaoAjustada, setDescricaoAjustada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  
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

  function saldoDa(n: Negociacao) {
    const total = Number(n.anuncio_qtd || 0)
    const vendida = Number(n.qtd_proposta || total)
    return { total, vendida, restante: Math.max(0, total - vendida) }
  }

  function abrirAceite(negociacao: Negociacao) {
    const { total, restante } = saldoDa(negociacao)
    const valorBase = Number(negociacao.anuncio_val_base || 0)
    const descricao = negociacao.anuncio_descricao || ""
    // Sugere a descrição com a quantidade antiga trocada pela restante
    const ajustada = total > 0 && restante > 0 ? descricao.replace(new RegExp(`\\b${total}\\b`, "g"), String(restante)) : descricao

    setReativarSaldo(true)
    setValorSaldo(total > 0 ? ((valorBase * restante) / total).toFixed(2).replace(".", ",") : "")
    setDescricaoSaldo(ajustada)
    setDescricaoAjustada(ajustada !== descricao)
    setAceitando(negociacao)
  }

  async function confirmarAceite() {
    if (!aceitando) return
    const { restante } = saldoDa(aceitando)
    const parcial = restante > 0
    const valor = valorSaldo.replace(/\./g, "").replace(",", ".")

    if (parcial && (!valor || Number(valor) <= 0)) return

    setEnviando(true)
    const result = await servicesUpdateNegociacao(aceitando.id, parcial
      ? { status: "A", reativar_saldo: reativarSaldo, novo_val_base: Number(valor).toFixed(2), ...(descricaoSaldo.trim() ? { nova_descricao: descricaoSaldo.trim() } : {}) }
      : { status: "A" })
    setEnviando(false)

    if (!(result as any)?.isError) {
      const { plural } = unidadeDeVenda(aceitando.anuncio_unidade)
      setSuccessAction("ACEITO")
      setSuccessValue(Number(aceitando.val_proposta || aceitando.anuncio_val_base || 0))
      setSuccessSaldo(parcial ? { restante, reativado: reativarSaldo, unidade: plural } : null)
      setIsSuccessOpen(true)
      setNegociacoes(prev => prev.filter(n => n.id !== aceitando.id))
      setAceitando(null)
    }
  }

  /* ─── Recusa com motivo ─── */
  const [recusando, setRecusando] = useState<Negociacao | null>(null)
  const [motivo, setMotivo] = useState<MotivoRecusa>("VALOR")
  const [detalheMotivo, setDetalheMotivo] = useState("")

  function abrirRecusa(negociacao: Negociacao) {
    setMotivo("VALOR")
    setDetalheMotivo("")
    setRecusando(negociacao)
  }

  async function confirmarRecusa() {
    if (!recusando) return
    setEnviando(true)
    const result = await servicesUpdateNegociacao(recusando.id, {
      status: "R",
      motivo_recusa: motivo,
      ...(detalheMotivo.trim() ? { detalhe_recusa: detalheMotivo.trim() } : {}),
    })
    setEnviando(false)
    if (!(result as any)?.isError) {
      setSuccessAction("RECUSADO")
      setIsSuccessOpen(true)
      setNegociacoes(prev => prev.filter(n => n.id !== recusando.id))
      setRecusando(null)
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
                      {formatarPrazo(negociacao.prazo_resposta) && (
                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                          Responda até {formatarPrazo(negociacao.prazo_resposta)}. Depois disso, a proposta expira.
                        </p>
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
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Oferta (Total p/ {negociacao.qtd_proposta || negociacao.anuncio_qtd} un.)
                      </span>
                      <span className="text-slate-800 font-black text-xl tracking-tight">
                        {valProposta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 line-through mt-0.5">
                        De: {valBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setSelectedNegociacao(negociacao)}
                        className="p-2 text-slate-400 hover:text-brand-header hover:bg-brand-subtle rounded-lg transition-all"
                        title="Analisar proposta"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => abrirAceite(negociacao)} className="p-2 text-slate-400 hover:text-success hover:bg-success-subtle rounded-lg transition-all" title="Aceitar proposta">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => abrirRecusa(negociacao)} className="p-2 text-slate-400 hover:text-danger hover:bg-danger-subtle rounded-lg transition-all" title="Recusar">
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
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white gap-0">
            <DialogHeader className="m-0 px-6 pt-6 pb-0 bg-white rounded-none border-0">
              <DialogTitle className="flex items-center justify-between text-slate-900 text-lg font-semibold">
                Análise de Proposta
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                  Anúncio #{selectedNegociacao.anuncio}
                </span>
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-2">
                Confira as condições propostas pelo comprador antes de tomar sua decisão.
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Resumo do Pedido */}
              <div className="bg-white p-5 rounded-lg border border-slate-200/60">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-blue-900">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 mb-1">{selectedNegociacao.anuncio_nome}</h4>
                    <div className="flex gap-6 text-sm text-slate-600">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-slate-400 mr-1 text-[11px] uppercase font-bold">Total Disp.:</span>
                          <span className="font-semibold">{selectedNegociacao.anuncio_qtd} un.</span>
                        </div>
                        <div>
                          <span className="text-blue-900 mr-1 text-[11px] uppercase font-bold">Qtd. Solicitada:</span>
                          <span className="font-semibold text-blue-900">{selectedNegociacao.qtd_proposta || selectedNegociacao.anuncio_qtd} un.</span>
                        </div>
                      </div>
                      {selectedNegociacao.anuncio_lote && (
                        <div><span className="text-slate-400 mr-1">Lote:</span><span className="font-semibold">{selectedNegociacao.anuncio_lote}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Valores Comparativos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-lg border border-slate-200/60 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200" />
                  <p className="text-xs uppercase font-bold text-slate-400 mb-1 pl-2">Valor Base</p>
                  <p className="font-semibold text-xl text-slate-500 line-through pl-2">
                    {Number(selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 relative overflow-hidden">
                  <p className="text-xs uppercase font-bold text-blue-800 mb-1 relative z-10">
                    Proposta Total (p/ {selectedNegociacao.qtd_proposta || selectedNegociacao.anuncio_qtd} un.)
                  </p>
                  <p className="font-semibold text-3xl text-slate-900 tabular-nums tracking-tight relative z-10 flex items-center justify-between">
                    {Number(selectedNegociacao.val_proposta || selectedNegociacao.anuncio_val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {(Number(selectedNegociacao.val_proposta) < Number(selectedNegociacao.anuncio_val_base)) && (
                      <TrendingDown className="w-6 h-6 text-emerald-700" />
                    )}
                  </p>
                </div>
              </div>

              {/* Info do Comprador */}
              {(selectedNegociacao.ds_obs || selectedNegociacao.comprador) && (
                <div className="bg-white p-5 rounded-lg border border-slate-200/60 flex flex-col gap-4">
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
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              >
                Voltar
              </button>
              <div className="flex w-full sm:w-auto gap-3">
                <button 
                  onClick={() => { abrirRecusa(selectedNegociacao); setSelectedNegociacao(null) }} 
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-surface text-danger border border-danger-border hover:border-danger hover:bg-danger-subtle rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Recusar
                </button>
                <button 
                  onClick={() => { abrirAceite(selectedNegociacao); setSelectedNegociacao(null) }}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 group"
                >
                  Aceitar Proposta <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Recusa com motivo */}
      <ModalPadrao
        open={!!recusando}
        onOpenChange={(open) => !open && !enviando && setRecusando(null)}
        titulo="Recusar proposta?"
        descricao="O motivo é enviado ao comprador, para ele decidir se faz uma nova proposta. O anúncio volta ao catálogo."
        acoes={
          <>
            <button type="button" disabled={enviando} onClick={() => setRecusando(null)} className={BOTAO.secundario}>Cancelar</button>
            <button type="button" disabled={enviando} onClick={confirmarRecusa} className={BOTAO.perigo}>
              {enviando && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Recusar proposta
            </button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700 mb-2">Motivo</legend>
          {MOTIVOS_RECUSA.map((m) => (
            <label key={m.valor} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 cursor-pointer has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/50">
              <input
                type="radio"
                name="motivo-recusa"
                value={m.valor}
                checked={motivo === m.valor}
                onChange={() => setMotivo(m.valor)}
                className="accent-blue-700"
              />
              {m.rotulo}
            </label>
          ))}
        </fieldset>
        <label htmlFor="detalhe-recusa" className="block mt-4 text-sm font-medium text-slate-700 mb-1.5">
          Complemento <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <input
          id="detalhe-recusa"
          value={detalheMotivo}
          maxLength={255}
          onChange={(e) => setDetalheMotivo(e.target.value)}
          placeholder="Ex.: aceitaria a partir de R$ 35,00"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        />
      </ModalPadrao>

      {/* Confirmação do aceite */}
      <Dialog open={!!aceitando} onOpenChange={(open) => !open && !enviando && setAceitando(null)}>
        {aceitando && (() => {
          const { total, vendida, restante } = saldoDa(aceitando)
          const parcial = restante > 0
          const { plural } = unidadeDeVenda(aceitando.anuncio_unidade)
          const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          const valorInvalido = parcial && !(Number(valorSaldo.replace(/\./g, "").replace(",", ".")) > 0)
          return (
            <DialogContent className="sm:max-w-lg p-6 gap-0 bg-white">
              <DialogTitle className="text-lg font-semibold text-slate-900">Aceitar proposta?</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-slate-600">
                {parcial
                  ? `Venda parcial: ${vendida} de ${total} ${plural}. Defina o que acontece com o saldo restante.`
                  : "O comprador leva o lote inteiro e o anúncio é finalizado."}
              </DialogDescription>

              <dl className="mt-5 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                {[
                  ["Insumo", aceitando.anuncio_nome || "—"],
                  ["Comprador", aceitando.comprador_nome || "—"],
                  ["Quantidade vendida", `${vendida} ${plural}`],
                  ["Valor proposto", brl(Number(aceitando.val_proposta || 0))],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-slate-500 shrink-0">{rotulo}</dt>
                    <dd className="text-right font-medium text-slate-800 tabular-nums">{valor}</dd>
                  </div>
                ))}
              </dl>

              {parcial && (
                <div className="mt-5 rounded-lg border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Saldo restante</p>
                    <span className="text-sm font-semibold text-blue-800 tabular-nums">{restante} {plural}</span>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reativarSaldo}
                      onChange={(e) => setReativarSaldo(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-blue-700"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Recolocar o saldo restante no catálogo</span>
                      <span className="block text-xs text-slate-500">
                        Se desmarcar, o saldo fica em &quot;Saldo de vendas&quot; e você pode reativá-lo depois.
                      </span>
                    </span>
                  </label>

                  <div>
                    <label htmlFor="valor-saldo" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Valor total do saldo ({restante} {plural})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                      <input
                        id="valor-saldo"
                        inputMode="decimal"
                        value={valorSaldo}
                        onChange={(e) => setValorSaldo(e.target.value)}
                        className={`w-full h-10 pl-9 pr-3 rounded-lg border text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600/15 tabular-nums ${valorInvalido ? "border-red-300" : "border-slate-200 focus:border-blue-600"}`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Sugerido proporcional ao valor anunciado. {valorInvalido && <span className="text-red-600">Informe um valor maior que zero.</span>}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="descricao-saldo" className="block text-sm font-medium text-slate-700 mb-1.5">Descrição do saldo</label>
                    <textarea
                      id="descricao-saldo"
                      value={descricaoSaldo}
                      onChange={(e) => setDescricaoSaldo(e.target.value)}
                      maxLength={2000}
                      className="w-full h-28 resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {descricaoAjustada
                        ? `Trocamos a quantidade citada (${total} → ${restante}). Revise antes de confirmar.`
                        : "Revise se a descrição ainda cita a quantidade antiga."}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => setAceitando(null)}
                  className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={enviando || valorInvalido}
                  onClick={confirmarAceite}
                  className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar aceite
                </button>
              </div>
            </DialogContent>
          )
        })()}
      </Dialog>

      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white gap-0">
          <DialogHeader className="m-0 px-6 pt-6 pb-0 bg-white rounded-none border-0">
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-semibold">
              {successAction === "ACEITO" ? "Proposta aceita" : "Proposta recusada"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-3 text-sm text-center">
              {successAction === "ACEITO" ? (
                <>
                  <p className="text-slate-600 text-base">
                    {successSaldo ? "Venda parcial aceita no valor de" : "Proposta aceita no valor de"} <br/>
                    <strong className="text-2xl mt-2 block text-slate-900 tabular-nums">{successValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  </p>
                  {successSaldo && (
                    <p className="text-slate-600">
                      {successSaldo.reativado
                        ? `O saldo de ${successSaldo.restante} ${successSaldo.unidade} voltou ao catálogo.`
                        : `O saldo de ${successSaldo.restante} ${successSaldo.unidade} ficou em "Saldo de vendas", fora do catálogo.`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-600 text-base font-medium">
                  A negociação foi recusada e o anúncio voltou ao catálogo.
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {successAction === "ACEITO" && successSaldo && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessOpen(false)
                    router.push("/meus-anuncios")
                  }}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Ver meus anúncios
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSuccessOpen(false)
                  if (successAction === "ACEITO") {
                    router.push("/caixa-de-propostas?tab=finalizados")
                  }
                }}
                className="flex-1 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition-colors cursor-pointer"
              >
                {successAction === "ACEITO" ? "Falar com o comprador" : "Fechar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}