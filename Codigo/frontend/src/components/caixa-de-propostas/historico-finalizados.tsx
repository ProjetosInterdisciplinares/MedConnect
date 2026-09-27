"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, Loader2, Inbox, CheckCircle2 } from "lucide-react"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import { Anuncio } from "@/types"
import { useRouter } from "next/navigation"

export function HistoricoFinalizadosTab() {
  const router = useRouter()
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await servicesGetMeusAnuncios()
        const listaAnuncios = Array.isArray(result) ? result : (result as any)?.data || []
        
        // Filtra apenas os finalizados
        const finalizados = listaAnuncios.filter((a: Anuncio) => a.ie_status === "F")
        setAnuncios(finalizados)
      } catch (error) {
        console.error("Erro ao carregar anúncios finalizados", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex flex-col h-full bg-white">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
          <Loader2 className="w-10 h-10 text-blue-900 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando histórico...</p>
        </div>
      ) : anuncios.length === 0 ? (
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
            {anuncios.map((anuncio) => {
            const nomeMaterial = anuncio.material_nome ?? "Material não identificado"
            
            // Em finalizados, exibimos o valor aceito
            const valorExibido = anuncio.val_aceito || anuncio.val_base

            return (
              <div
                key={anuncio.nr_anuncio}
                onClick={() => router.push(`/anunciar/${anuncio.nr_anuncio}`)}
                className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer hover:border-blue-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 items-center justify-center shrink-0 border border-slate-100 group-hover:bg-blue-50 transition-colors">
                    <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Anúncio #{anuncio.nr_anuncio}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-slate-800 leading-tight">
                      {nomeMaterial}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mt-2">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <span className="font-semibold text-slate-700">Qtd vendida:</span>
                        {anuncio.qtd_mat}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {anuncio.data_anuncio ?? "—"}
                      </span>
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
        </div>
      )}
    </div>
  )
}
