"use client"

import React, { useEffect, useState } from "react"
import { PackageX, Pencil, Trash2 } from "lucide-react"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import { Anuncio, MatMed } from "@/types"

interface MeusAnunciosProps {
  materiais: MatMed[]
}

export function MeusAnuncios({ materiais }: MeusAnunciosProps) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await servicesGetMeusAnuncios()
        if (response && "isError" in response) {
          console.error("Erro ao buscar meus anúncios:", response.message)
        } else {
          setAnuncios(response || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Buscando seus anúncios...</p>
        </div>
      </div>
    )
  }

  if (anuncios.length === 0) {
    return (
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <PackageX size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum anúncio publicado</h3>
        <p className="text-slate-500 text-center max-w-sm">
          Você ainda não publicou nenhum insumo no catálogo. Use a aba "Publicar Anúncio" para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-transparent">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Meus Anúncios</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie os insumos que você publicou no marketplace.</p>
        </div>
        <div className="bg-blue-50 text-blue-900 px-4 py-1.5 rounded-full text-sm font-bold">
          {anuncios.length} {anuncios.length === 1 ? "anúncio" : "anúncios"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {anuncios.map((anuncio) => {
          const materialObj = materiais.find(m => String(m.cd_mat) === String(anuncio.cd_mat))
          
          const nomeMaterial = materialObj?.ds_mat || "Insumo não identificado"
          const loteTexto = anuncio.ds_lote || "Sem lote"
          
          let dataValidade = "Não informada"
          if (anuncio.dt_validade) {
            dataValidade = new Date(anuncio.dt_validade).toLocaleDateString("pt-BR")
          }

          const getStatusBadge = (status: string) => {
            switch(status) {
              case 'A': return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">Ativo</span>
              case 'I': return <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs font-bold">Inativo</span>
              case 'N': return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">Em Negociação</span>
              case 'F': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Fechado</span>
              default: return <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs font-bold">{status}</span>
            }
          }

          return (
            <div key={anuncio.nr_anuncio} className="bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col">
              <div className="w-full aspect-square bg-slate-50/50 rounded-xl mb-4 flex items-center justify-center border border-slate-100 overflow-hidden relative">
                {anuncio.imagem_anuncio ? (
                  <img src={anuncio.imagem_anuncio} alt={nomeMaterial} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <PackageX className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sem Foto</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(anuncio.ie_status)}
                </div>
              </div>
              
              <div className="mb-3">
                <h3 className="font-bold text-slate-800 text-[15px] leading-tight mb-1 line-clamp-2" title={nomeMaterial}>
                  {nomeMaterial}
                </h3>
              </div>

              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-sm font-bold text-blue-900">R$</span>
                <span className="text-2xl font-extrabold text-blue-900 tracking-tight leading-none">
                  {Number(anuncio.val_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-500 mt-auto mb-4 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span>Quantidade</span>
                  <span className="font-medium text-slate-700">{anuncio.qtd_mat} unid.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lote</span>
                  <span className="font-medium text-slate-700 line-clamp-1 text-right max-w-[120px]" title={loteTexto}>{loteTexto}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Validade</span>
                  <span className="font-medium text-slate-700">{dataValidade}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
