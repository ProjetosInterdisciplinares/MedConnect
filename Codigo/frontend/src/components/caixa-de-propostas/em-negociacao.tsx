"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Inbox, Loader2, Eye, TrendingDown, CheckCircle2, XCircle, Building2, Tag, Info, ArrowRight } from "lucide-react"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesGetMeusMaaterials from "@/server/(GET)-meus-materiais"
import servicesGetPessoasJuridicas from "@/server/(GET)-pessoas-juridicas"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio, MatMed, PessoaJuridica } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function NegociacaoTab() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [pessoas, setPessoas] = useState<PessoaJuridica[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnuncio, setSelectedAnuncio] = useState<Anuncio | null>(null)

  useEffect(() => {
    async function load() {
      const [anunciosResult, materiaisResult, pessoasResult] = await Promise.all([
        servicesGetMeusAnuncios(),
        servicesGetMeusMaaterials(),
        servicesGetPessoasJuridicas()
      ])

      const listaAnuncios = Array.isArray(anunciosResult) ? anunciosResult : (anunciosResult as any)?.data || []
      const listaMateriais = Array.isArray(materiaisResult) ? materiaisResult : (materiaisResult as any)?.data || []
      const listaPessoas = Array.isArray(pessoasResult) ? pessoasResult : (pessoasResult as any)?.data || []

      setAnuncios(listaAnuncios)
      setMateriais(listaMateriais)
      setPessoas(listaPessoas)
      setLoading(false)
    }
    load()
  }, [])

  const materiaisMap = useMemo(() => {
    return new Map(materiais.map((m) => [m.cd_mat, m]))
  }, [materiais])

  const pessoasMap = useMemo(() => {
    return new Map(pessoas.map((p) => [p.cd_pessoaj, p]))
  }, [pessoas])

  const itensFiltrados = useMemo(() => {
    return anuncios.filter((a) => a.ie_status === "N")
  }, [anuncios])

  async function aceitarProposta(anuncio: Anuncio) {
    const result = await servicesUpdateAnuncio(anuncio.nr_anuncio, { ie_status: "F" })
    if (!(result as any)?.isError) window.location.reload()
  }

  async function recusarProposta(anuncio: Anuncio) {
    const result = await servicesUpdateAnuncio(anuncio.nr_anuncio, { ie_status: "A" })
    if (!(result as any)?.isError) window.location.reload()
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
            {itensFiltrados.map((anuncio) => {
              const materialObj = materiaisMap.get(anuncio.cd_mat)
              const nomeMaterial = materialObj?.ds_mat ?? "Material não identificado"
              const valBase = Number(anuncio.val_base || 0)
              const valProposta = Number(anuncio.val_proposta || anuncio.val_base || 0)
              const isDesconto = valProposta < valBase

              return (
                <li key={anuncio.nr_anuncio} className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-blue-50/30 transition-colors">
                  {/* Left info */}
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                    <div className="hidden md:flex mt-1 w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-blue-100 items-center justify-center shrink-0 border border-slate-200 group-hover:border-blue-200 transition-colors">
                      <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-900 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID #{anuncio.nr_anuncio}</span>
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
                          <span className="font-medium">Qtd: {anuncio.qtd_mat}</span>
                        </span>
                        {anuncio.cd_pessoa_compradora && (
                          <span className="flex items-center gap-2 text-slate-600">
                            <Building2 size={14} className="text-slate-400" />
                            <span className="font-medium text-blue-950 hover:underline cursor-pointer">
                              {pessoasMap.get(anuncio.cd_pessoa_compradora)?.razao_social || `Comprador #${anuncio.cd_pessoa_compradora}`}
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
                        onClick={() => setSelectedAnuncio(anuncio)}
                        className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all"
                        title="Analisar proposta"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => aceitarProposta(anuncio)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Aceitar rapidamente">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => recusarProposta(anuncio)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Recusar">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Detalhes da Proposta Dialog (Modernizado) */}
      <Dialog open={!!selectedAnuncio} onOpenChange={(open) => !open && setSelectedAnuncio(null)}>
        {selectedAnuncio && (
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
            <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950">
              <DialogTitle className="flex items-center justify-between text-xl font-black text-white">
                Análise de Proposta
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                  ID #{selectedAnuncio.nr_anuncio}
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
                    <h4 className="font-bold text-lg text-slate-800 mb-1">{materiaisMap.get(selectedAnuncio.cd_mat)?.ds_mat}</h4>
                    <div className="flex gap-6 text-sm text-slate-600">
                      <div><span className="text-slate-400 mr-1">Quantidade:</span><span className="font-semibold">{selectedAnuncio.qtd_mat}</span></div>
                      {selectedAnuncio.ds_lote && (
                        <div><span className="text-slate-400 mr-1">Lote:</span><span className="font-semibold">{selectedAnuncio.ds_lote}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Valores Comparativos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200" />
                  <p className="text-xs uppercase font-bold text-slate-400 mb-1 pl-2">Valor Base do Anúncio</p>
                  <p className="font-semibold text-xl text-slate-500 line-through pl-2">
                    {Number(selectedAnuncio.val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                
                <div className="bg-blue-900 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-800 rounded-full blur-2xl opacity-50 pointer-events-none" />
                  <p className="text-xs uppercase font-bold text-blue-100 mb-1 relative z-10">Valor Proposto</p>
                  <p className="font-black text-3xl text-white tracking-tight relative z-10 flex items-center justify-between">
                    {Number(selectedAnuncio.val_proposta || selectedAnuncio.val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    {(Number(selectedAnuncio.val_proposta) < Number(selectedAnuncio.val_base)) && (
                      <TrendingDown className="w-6 h-6 text-emerald-300" />
                    )}
                  </p>
                </div>
              </div>

              {/* Observações / Info extra */}
              {(selectedAnuncio.ds_obs || selectedAnuncio.cd_pessoa_compradora) && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                  {selectedAnuncio.cd_pessoa_compradora && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs uppercase font-bold text-slate-400 mb-0.5">Comprador Interessado</p>
                        <p className="font-semibold text-slate-700">
                          {pessoasMap.get(selectedAnuncio.cd_pessoa_compradora)?.razao_social || `Razão Social Não Encontrada (ID: ${selectedAnuncio.cd_pessoa_compradora})`}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedAnuncio.ds_obs && (
                    <div className="flex items-start gap-3 pt-4 border-t border-slate-100">
                      <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs uppercase font-bold text-amber-600/80 mb-0.5">Suas Observações Iniciais</p>
                        <p className="text-sm text-slate-600 italic leading-relaxed">{selectedAnuncio.ds_obs}</p>
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
                onClick={() => setSelectedAnuncio(null)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Voltar
              </button>
              <div className="flex w-full sm:w-auto gap-3">
                <button 
                  onClick={() => { recusarProposta(selectedAnuncio); setSelectedAnuncio(null) }} 
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-white text-rose-600 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Recusar
                </button>
                <button 
                  onClick={() => { aceitarProposta(selectedAnuncio); setSelectedAnuncio(null) }} 
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-950 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group"
                >
                  Aceitar Proposta <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}