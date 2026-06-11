"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, Inbox, Loader2 } from "lucide-react"
import servicesGetMinhasPropostas from "@/server/(GET)-minhas-propostas"
import servicesGetMeusMaaterials from "@/server/(GET)-meus-materiais"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio, MatMed } from "@/types"

export function PropostasTab() {
  const [propostas, setPropostas] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [propostasResult, materiaisResult] = await Promise.all([
        servicesGetMinhasPropostas(),
        servicesGetMeusMaaterials(),
      ])

      const listaPropostas = Array.isArray(propostasResult) ? propostasResult : (propostasResult as any)?.data || []
      const listaMateriais = Array.isArray(materiaisResult) ? materiaisResult : (materiaisResult as any)?.data || []

      setPropostas(listaPropostas)
      setMateriais(listaMateriais)
      setLoading(false)
    }
    load()
  }, [])

  const materiaisMap = useMemo(() => {
    return new Map(materiais.map((m) => [m.cd_mat, m.ds_mat]))
  }, [materiais])

  async function cancelarProposta(anuncio: Anuncio) {
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

  if (propostas.length === 0) {
    return (
      <div className="bg-white border border-dashed border-zinc-300 p-12 rounded-2xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="font-bold text-lg text-zinc-800 mb-1">Nenhuma proposta enviada</h3>
        <p className="text-zinc-500 text-sm max-w-sm">Você ainda não enviou propostas para anúncios de outros hospitais.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {propostas.map((anuncio) => {
        const nomeMaterial = anuncio.material_nome ?? "Material não identificado"
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
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-zinc-400" /> {anuncio.data_anuncio ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-zinc-100 pt-4 md:pt-0 mt-2 md:mt-0">
              <span className="text-sky-700 font-extrabold text-xl">
                {Number(valorExibido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <span className="px-3 py-1.5 text-xs font-bold rounded-full border tracking-wide shadow-sm bg-sky-50 text-sky-700 border-sky-200">
                ENVIADA
              </span>
              <div className="flex gap-2 ml-4">
                <button onClick={() => cancelarProposta(anuncio)} className="px-4 py-2 bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-lg font-semibold hover:bg-zinc-200 transition">
                  Cancelar Envio
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}