"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, Inbox, Loader2 } from "lucide-react"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesGetMeusMaaterials from "@/server/(GET)-meus-materiais"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio, MatMed } from "@/types"

export function NegociacaoTab() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [anunciosResult, materiaisResult] = await Promise.all([
        servicesGetMeusAnuncios(),
        servicesGetMeusMaaterials(),
      ])

      const listaAnuncios = Array.isArray(anunciosResult) ? anunciosResult : (anunciosResult as any)?.data || []
      const listaMateriais = Array.isArray(materiaisResult) ? materiaisResult : (materiaisResult as any)?.data || []

      setAnuncios(listaAnuncios)
      setMateriais(listaMateriais)
      setLoading(false)
    }
    load()
  }, [])

  const materiaisMap = useMemo(() => {
    return new Map(materiais.map((m) => [m.cd_mat, m.ds_mat]))
  }, [materiais])

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
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
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
        const nomeMaterial = materiaisMap.get(anuncio.cd_mat) ?? "Material não identificado"
        const valorExibido = anuncio.val_proposta || anuncio.val_base

        return (
          <div key={anuncio.nr_anuncio} className="bg-white border border-zinc-200/80 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start gap-4">
              <div className="hidden md:flex w-12 h-12 rounded-full bg-sky-50 items-center justify-center shrink-0 border border-sky-100">
                <Package className="w-6 h-6 text-sky-700" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-sky-700 block mb-1">Anúncio #{anuncio.nr_anuncio}</span>
                <h3 className="font-bold text-lg text-zinc-800 leading-tight">{nomeMaterial}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 mt-2">
                  <span className="flex items-center gap-1.5 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                    <span className="font-semibold text-zinc-700">Qtd:</span> {anuncio.qtd_mat}
                  </span>
                  {anuncio.cd_pessoa_compradora && (
                    <span className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 text-amber-700 font-medium">
                      Comprador #{anuncio.cd_pessoa_compradora}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-zinc-400" /> {anuncio.data_anuncio ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-zinc-100 pt-4 md:pt-0 mt-2 md:mt-0">
              <span className="text-emerald-600 font-extrabold text-xl">
                {Number(valorExibido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-full border tracking-wide shadow-sm bg-amber-50 text-amber-700 border-amber-200">
                EM NEGOCIAÇÃO
              </span>
              <div className="flex gap-2 ml-4">
                <button onClick={() => aceitarProposta(anuncio)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition">
                  Aceitar
                </button>
                <button onClick={() => recusarProposta(anuncio)} className="px-4 py-2 bg-zinc-500 text-white rounded-lg font-semibold hover:bg-zinc-600 transition">
                  Recusar
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}