"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, Inbox, Loader2, Eye, TrendingDown, CheckCircle, XCircle } from "lucide-react"
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

  // Filtra apenas os anúncios em negociação do usuário
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (itensFiltrados.length === 0) {
    return (
      <div className="bg-white border border-dashed border-zinc-300 p-12 rounded-2xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="font-bold text-lg text-zinc-800 mb-1">Nenhum registro encontrado</h3>
        <p className="text-zinc-500 text-sm max-w-sm">Ainda não existem negociações pendentes no seu histórico.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {itensFiltrados.map((anuncio) => {
        const materialObj = materiaisMap.get(anuncio.cd_mat)
        const nomeMaterial = materialObj?.ds_mat ?? "Material não identificado"
        const valBase = Number(anuncio.val_base || 0)
        const valProposta = Number(anuncio.val_proposta || anuncio.val_base || 0)
        const isDesconto = valProposta < valBase

        return (
          <div key={anuncio.nr_anuncio} className="bg-white border border-blue-100 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start gap-4">
              <div className="hidden md:flex w-12 h-12 rounded-full bg-blue-50 items-center justify-center shrink-0 border border-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 block mb-1">Anúncio #{anuncio.nr_anuncio}</span>
                <h3 className="font-bold text-lg text-slate-800 leading-tight">{nomeMaterial}</h3>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mt-2">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <span className="font-semibold text-slate-700">Qtd:</span> {anuncio.qtd_mat}
                  </span>
                  {anuncio.cd_pessoa_compradora && (
                    <span className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 text-amber-700 font-medium">
                      {pessoasMap.get(anuncio.cd_pessoa_compradora)?.razao_social || `Comprador #${anuncio.cd_pessoa_compradora}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0 flex-1 md:flex-none">
              
              {/* Box de Preços (Original vs Proposto) */}
              <div className="flex flex-col text-right">
                <span className="text-xs font-medium text-slate-400 line-through mb-0.5">
                  De: {valBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <div className="flex items-center gap-2 justify-end">
                  {isDesconto && <TrendingDown className="w-4 h-4 text-emerald-500" />}
                  <span className="text-blue-600 font-extrabold text-xl">
                    {valProposta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedAnuncio(anuncio)}
                  className="p-2.5 bg-slate-50 text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-lg transition-colors"
                  title="Ver detalhes da proposta"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button onClick={() => aceitarProposta(anuncio)} className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors" title="Aceitar">
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button onClick={() => recusarProposta(anuncio)} className="p-2.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white rounded-lg transition-colors" title="Recusar">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Detalhes da Proposta Dialog */}
      <Dialog open={!!selectedAnuncio} onOpenChange={(open) => !open && setSelectedAnuncio(null)}>
        {selectedAnuncio && (
          <DialogContent className="sm:max-w-md md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl text-blue-900 font-bold">Analisar Proposta</DialogTitle>
              <DialogDescription>
                Confira os detalhes do seu anúncio e a proposta recebida antes de tomar uma decisão.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Produto Anunciado</p>
                <p className="font-bold text-slate-800">{materiaisMap.get(selectedAnuncio.cd_mat)?.ds_mat}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-slate-500">Qtd:</span> <span className="font-bold text-slate-700">{selectedAnuncio.qtd_mat}</span>
                  </div>
                  {selectedAnuncio.nr_lote && (
                    <div>
                      <span className="text-slate-500">Lote:</span> <span className="font-bold text-slate-700">{selectedAnuncio.nr_lote}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Valor Original (Base)</p>
                  <p className="font-medium text-slate-500 line-through">
                    {Number(selectedAnuncio.val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 w-full h-1 bg-blue-500" />
                  <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Valor Proposto</p>
                  <p className="font-black text-2xl text-blue-700 tracking-tight">
                    {Number(selectedAnuncio.val_proposta || selectedAnuncio.val_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>

              {selectedAnuncio.ds_obs && (
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Observações do seu anúncio</p>
                  <p className="text-sm text-amber-800">{selectedAnuncio.ds_obs}</p>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 sm:justify-between flex-row">
              <button
                type="button"
                onClick={() => setSelectedAnuncio(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Voltar
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => { recusarProposta(selectedAnuncio); setSelectedAnuncio(null) }} 
                  className="px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-lg font-semibold hover:bg-rose-50 transition-colors"
                >
                  Recusar Proposta
                </button>
                <button 
                  onClick={() => { aceitarProposta(selectedAnuncio); setSelectedAnuncio(null) }} 
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Aceitar Proposta
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}