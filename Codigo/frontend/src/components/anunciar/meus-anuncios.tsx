"use client"

import React, { useEffect, useState } from "react"
import { PackageX, Pencil, Trash2, Calendar, Hash, Layers, FileText, AlertCircle } from "lucide-react"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesDeleteAnuncio from "@/server/(DELETE)-anuncio"
import { Anuncio, MatMed } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface MeusAnunciosProps {
  materiais: MatMed[]
}

export function MeusAnuncios({ materiais }: MeusAnunciosProps) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnuncio, setSelectedAnuncio] = useState<Anuncio | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteAnuncio(nrAnuncio: number) {
    if (!confirm("Tem certeza que deseja excluir este anúncio?")) return;
    setIsDeleting(true);
    try {
      const response = await servicesDeleteAnuncio(nrAnuncio);
      if (response && "isError" in response) {
        alert("Erro ao excluir: " + response.message);
      } else {
        setAnuncios((prev) => prev.filter((a) => a.nr_anuncio !== nrAnuncio));
        setIsDetailsOpen(false);
        setSelectedAnuncio(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir anúncio.");
    } finally {
      setIsDeleting(false);
    }
  }

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
            <div 
              key={anuncio.nr_anuncio} 
              onClick={() => {
                setSelectedAnuncio(anuncio)
                setIsDetailsOpen(true)
              }}
              className="bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group flex flex-col cursor-pointer"
            >
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-slate-50 gap-0 border-slate-200/60 shadow-2xl">
          {selectedAnuncio && (
            <>
              <DialogHeader className="m-0 bg-blue-900 px-6 py-5 rounded-t-xl border-b border-blue-950">
                <DialogTitle className="flex items-center gap-2 text-white text-xl font-black">
                  Detalhes do Anúncio
                </DialogTitle>
                <DialogDescription className="text-blue-100">
                  Visualize as informações completas ou exclua a oferta.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="flex flex-col gap-6">
                  {/* Foto e Titulo */}
                  <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
                    <div className="w-32 h-32 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                      {selectedAnuncio.imagem_anuncio ? (
                        <img src={selectedAnuncio.imagem_anuncio} alt="Imagem" className="w-full h-full object-cover" />
                      ) : (
                        <PackageX className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left w-full">
                      <h3 className="font-bold text-slate-800 text-lg">
                        {materiais.find(m => String(m.cd_mat) === String(selectedAnuncio.cd_mat))?.ds_mat || "Insumo não identificado"}
                      </h3>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-900 rounded-lg">
                        <span className="text-sm font-bold">R$</span>
                        <span className="text-2xl font-black">{Number(selectedAnuncio.val_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex gap-2 justify-center md:justify-start">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">Lote: {selectedAnuncio.ds_lote || "Não informado"}</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">Qtd: {selectedAnuncio.qtd_mat}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Secundários */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={14} />
                        <span className="text-xs font-semibold">Fabricação</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedAnuncio.dt_fabricacao ? new Date(selectedAnuncio.dt_fabricacao).toLocaleDateString("pt-BR") : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <AlertCircle size={14} />
                        <span className="text-xs font-semibold">Validade</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedAnuncio.dt_validade ? new Date(selectedAnuncio.dt_validade).toLocaleDateString("pt-BR") : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <FileText size={16} />
                      <span className="text-sm font-semibold">Observações</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedAnuncio.ds_obs || "Nenhuma observação informada."}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDeleteAnuncio(selectedAnuncio.nr_anuncio)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {isDeleting ? "Excluindo..." : "Excluir Anúncio"}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
