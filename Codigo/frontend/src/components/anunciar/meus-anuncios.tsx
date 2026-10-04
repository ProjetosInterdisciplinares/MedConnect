"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Package, PackageX, Pencil, Trash2, Calendar, Hash, Layers, FileText, AlertCircle, FileStack, Tag, Handshake, CheckCircle2 } from "lucide-react"
import servicesGetMeusAnuncios from "@/server/(GET)-meus-anuncios"
import servicesDeleteAnuncio from "@/server/(DELETE)-anuncio"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio, MatMed } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Pagination } from "@/components/ui/pagination"

const TABS = [
  { id: "ALL", label: "Todos", description: "Todos os seus anúncios publicados", icon: Layers },
  { id: "S", label: "Saldo de Vendas", description: "Anúncios restantes de vendas parciais", icon: Layers },
  { id: "A", label: "Ativos", description: "Anúncios visíveis no catálogo", icon: Tag },
  { id: "N", label: "Em Negociação", description: "Anúncios com lances pendentes", icon: Handshake },
  { id: "F", label: "Fechados", description: "Anúncios vendidos", icon: CheckCircle2 },
  { id: "I", label: "Rascunhos / Inativos", description: "Anúncios ocultos e em edição", icon: FileStack }
]

interface MeusAnunciosProps {
  materiais: MatMed[]
}

export function MeusAnuncios({ materiais }: MeusAnunciosProps) {
  const router = useRouter()
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnuncio, setSelectedAnuncio] = useState<Anuncio | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"none" | "delete" | "activate" | "inactivate">("none")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({ val_base: "", ie_status: "", dt_validade: "", ds_lote: "", ds_obs: "", qtd_mat: "" })
  
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6
  
  const filteredAnuncios = anuncios.filter(a => statusFilter === "ALL" || a.ie_status === statusFilter)
  const totalPages = Math.ceil(filteredAnuncios.length / ITEMS_PER_PAGE) || 1
  const paginatedAnuncios = filteredAnuncios.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  async function handleDeleteAnuncio(nrAnuncio: number) {
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

  async function handleUpdateAnuncio() {
    if (!selectedAnuncio) return
    setIsSaving(true)
    try {
      const response = await servicesUpdateAnuncio(selectedAnuncio.nr_anuncio, {
        val_base: editForm.val_base,
        qtd_mat: Number(editForm.qtd_mat),
        ie_status: selectedAnuncio.ie_status as any,
        dt_validade: editForm.dt_validade || null,
        ds_lote: editForm.ds_lote || null,
        ds_obs: editForm.ds_obs || ""
      })
      if (response && "isError" in response) {
        alert("Erro ao salvar: " + response.message)
      } else {
        const updated = { ...selectedAnuncio, ...editForm, ie_status: selectedAnuncio.ie_status, val_base: Number(editForm.val_base), qtd_mat: Number(editForm.qtd_mat) } as unknown as Anuncio
        setAnuncios(prev => prev.map(a => a.nr_anuncio === updated.nr_anuncio ? updated : a))
        setSelectedAnuncio(updated)
        setIsEditing(false)
      }
    } catch (e) {
      alert("Erro inesperado ao salvar.")
    } finally {
      setIsSaving(false)
    }
  }
  async function handleActivateAnuncio() {
    if (!selectedAnuncio) return
    setIsSaving(true)
    try {
      const response = await servicesUpdateAnuncio(selectedAnuncio.nr_anuncio, {
        val_base: String(selectedAnuncio.val_base),
        qtd_mat: Number(selectedAnuncio.qtd_mat),
        ie_status: "A" as any,
        dt_validade: selectedAnuncio.dt_validade || null,
        ds_lote: selectedAnuncio.ds_lote || null,
        ds_obs: selectedAnuncio.ds_obs || ""
      })
      if (response && "isError" in response) {
        alert("Erro ao ativar: " + response.message)
      } else {
        const updated = { ...selectedAnuncio, ie_status: "A" } as Anuncio
        setAnuncios(prev => prev.map(a => a.nr_anuncio === updated.nr_anuncio ? updated : a))
        setSelectedAnuncio(updated)
      }
    } catch (e) {
      alert("Erro inesperado ao ativar.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleInativarAnuncio() {
    if (!selectedAnuncio) return
    setIsSaving(true)
    try {
      const response = await servicesUpdateAnuncio(selectedAnuncio.nr_anuncio, {
        val_base: String(selectedAnuncio.val_base),
        qtd_mat: Number(selectedAnuncio.qtd_mat),
        ie_status: "I" as any,
        dt_validade: selectedAnuncio.dt_validade || null,
        ds_lote: selectedAnuncio.ds_lote || null,
        ds_obs: selectedAnuncio.ds_obs || ""
      })
      if (response && "isError" in response) {
        alert("Erro ao pausar: " + response.message)
      } else {
        const updated = { ...selectedAnuncio, ie_status: "I" } as Anuncio
        setAnuncios(prev => prev.map(a => a.nr_anuncio === updated.nr_anuncio ? updated : a))
        setSelectedAnuncio(updated)
      }
    } catch (e) {
      alert("Erro inesperado ao pausar.")
    } finally {
      setIsSaving(false)
    }
  }



  useEffect(() => {
    async function fetchData() {
      try {
        const response = await servicesGetMeusAnuncios()
        if (response && "isError" in response) {
          console.error("Erro ao buscar meus anúncios:", response.message)
        } else {
          const anunciosData = response || []
          setAnuncios(anunciosData)
          if (anunciosData.some((a: Anuncio) => a.ie_status === "S")) {
            setStatusFilter("S")
          } else {
            setStatusFilter("ALL")
          }
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
    <div className="flex flex-col md:flex-row gap-8 items-start w-full">
      {/* Sidebar de Filtros */}
      <aside className="w-full md:w-72 shrink-0 flex flex-col gap-2">
        {TABS.map(({ id, label, description, icon: Icon }) => {
          const isActive = statusFilter === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setStatusFilter(id)
                setCurrentPage(1)
              }}
              className={`relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group ${
                isActive
                  ? "bg-white shadow-sm ring-1 ring-slate-200/50"
                  : "hover:bg-white/50"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />
              )}
              <div className={`shrink-0 rounded-xl p-2 transition-colors ${
                isActive ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500 group-hover:text-blue-900 group-hover:bg-blue-50/50"
              }`}>
                <Icon size={20} />
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isActive ? "text-slate-800" : "text-slate-600"}`}>
                  {label}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  {description}
                </p>
              </div>
            </button>
          )
        })}
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 w-full min-w-0">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          {/* Header Interno */}
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {TABS.find(t => t.id === statusFilter)?.label}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {TABS.find(t => t.id === statusFilter)?.description}
              </p>
            </div>
            <div className="bg-blue-50 text-blue-950 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 shadow-inner">
              {filteredAnuncios.length} Anúncio{filteredAnuncios.length !== 1 && 's'}
            </div>
          </div>

          {statusFilter === "S" && filteredAnuncios.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 m-6 mb-0 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="bg-amber-100 p-2 rounded-full shrink-0 h-fit">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-800 text-sm">Atenção às sobras de vendas parciais</h3>
                <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                  Estes anúncios são remanescentes de vendas parciais concluídas. Antes de reativá-los no catálogo, 
                  <strong> revise a quantidade, o valor total e as observações</strong> para garantir que as informações da sobra estejam corretas e atrativas para um novo comprador.
                </p>
              </div>
            </div>
          )}

          {filteredAnuncios.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100">
                <PackageX className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="font-bold text-xl text-slate-700 mb-2">Nenhum anúncio encontrado</h3>
              <p className="text-slate-500">Nenhum anúncio corresponde ao filtro selecionado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {paginatedAnuncios.map((anuncio) => {
                const materialObj = materiais.find(m => String(m.cd_mat) === String(anuncio.cd_mat))
                const nomeMaterial = materialObj?.ds_mat || "Insumo não identificado"
                const loteTexto = anuncio.ds_lote || "Sem lote"
                
                let dataValidade = "Não informada"
                if (anuncio.dt_validade) {
                  dataValidade = new Date(anuncio.dt_validade).toLocaleDateString("pt-BR")
                }

                const getStatusBadge = (status: string) => {
                  switch(status) {
                    case 'A': return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">Ativo</span>
                    case 'I': return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">Rascunho</span>
                    case 'S': return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">Saldo de Venda</span>
                    case 'N': return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">Em Negociação</span>
                    case 'F': return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">Fechado</span>
                    default: return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">{status}</span>
                  }
                }

                return (
                  <li 
                    key={anuncio.nr_anuncio} 
                    onClick={() => {
                      setSelectedAnuncio(anuncio)
                      setEditForm({
                        val_base: String(anuncio.val_base || ""),
                        qtd_mat: String(anuncio.qtd_mat || ""),
                        ie_status: anuncio.ie_status,
                        dt_validade: anuncio.dt_validade || "",
                        ds_lote: anuncio.ds_lote || "",
                        ds_obs: anuncio.ds_obs || ""
                      })
                      setIsEditing(false)
                      setConfirmAction("none")
                      setIsDetailsOpen(true)
                    }}
                    className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    {/* Left info */}
                    <div className="flex items-start gap-5 flex-1 min-w-0">
                      <div className="hidden md:flex mt-1 w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-white items-center justify-center shrink-0 border border-slate-200 transition-colors overflow-hidden">
                        {anuncio.imagem_anuncio ? (
                          <img src={anuncio.imagem_anuncio} alt={nomeMaterial} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-900 transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID #{anuncio.nr_anuncio}</span>
                          {getStatusBadge(anuncio.ie_status)}
                        </div>
                        <h3 className="font-semibold text-lg text-slate-800 truncate pr-4">{nomeMaterial}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mt-2">
                          <span className="flex items-center gap-2 text-slate-600">
                            <Tag size={14} className="text-slate-400" />
                            <span className="font-medium">Qtd: {anuncio.qtd_mat} un.</span>
                          </span>
                          <span className="flex items-center gap-2 text-slate-600">
                            <Layers size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-500 line-clamp-1 max-w-[120px]" title={loteTexto}>Lote: {loteTexto}</span>
                          </span>
                          <span className="flex items-center gap-2 text-slate-600">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-500">Validade: {dataValidade}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right actions / pricing */}
                    <div className="flex flex-col items-end justify-center pl-0 md:pl-6 md:border-l border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                        Valor Total
                      </span>
                      <span className="text-slate-800 font-black text-xl tracking-tight">
                        {Number(anuncio.val_base || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

      {totalPages > 1 && (
        <div className="mt-8 mb-4">
          <Pagination 
            totalPages={totalPages} 
            currentPage={currentPage} 
            totalItems={anuncios.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} 
          />
        </div>
      )}
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
                {selectedAnuncio.ie_status === 'S' && confirmAction === "none" && (
                  <div className="bg-amber-50 border border-amber-200 p-4 mb-6 rounded-xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h3 className="font-bold text-amber-800 text-sm">Este anúncio é uma Sobra</h3>
                      <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                        Lembre-se de editar a <strong>quantidade</strong>, o <strong>valor total</strong> e as <strong>observações</strong> antes de reativar este anúncio.
                      </p>
                    </div>
                  </div>
                )}
                {confirmAction !== "none" ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmAction === 'delete' ? 'bg-red-100 text-red-600' : confirmAction === 'activate' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                      {confirmAction === 'delete' ? <Trash2 size={32} /> : confirmAction === 'activate' ? <Tag size={32} /> : <PackageX size={32} />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {confirmAction === 'delete' ? 'Excluir Anúncio?' : confirmAction === 'activate' ? 'Ativar Anúncio?' : 'Pausar Anúncio?'}
                    </h3>
                    <p className="text-slate-500 mb-8 max-w-sm">
                      {confirmAction === 'delete' 
                        ? 'Esta ação é irreversível. O anúncio será permanentemente removido do catálogo e não poderá ser recuperado.' 
                        : confirmAction === 'activate' 
                        ? 'O anúncio voltará a ficar visível no catálogo de vendas para todos os compradores.' 
                        : 'O anúncio será ocultado do catálogo e ficará na sua lista de Inativos.'}
                    </p>
                    
                    <div className="flex gap-3 w-full">
                      <button
                        type="button"
                        onClick={() => setConfirmAction("none")}
                        disabled={isDeleting || isSaving}
                        className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting || isSaving}
                        onClick={() => {
                          if (confirmAction === 'delete') handleDeleteAnuncio(selectedAnuncio.nr_anuncio);
                          else if (confirmAction === 'activate') { handleActivateAnuncio(); setConfirmAction("none"); }
                          else if (confirmAction === 'inactivate') { handleInativarAnuncio(); setConfirmAction("none"); }
                        }}
                        className={`flex-1 px-4 py-3 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : confirmAction === 'activate' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-slate-600 hover:bg-slate-700 shadow-slate-600/20'}`}
                      >
                        {isDeleting || isSaving ? (
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : confirmAction === 'delete' ? (
                          "Sim, Excluir"
                        ) : confirmAction === 'activate' ? (
                          "Sim, Ativar"
                        ) : (
                          "Sim, Pausar"
                        )}
                      </button>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div className="flex flex-col gap-4">
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Editar Anúncio</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor Base (Total)</label>
                        <input type="number" step="0.01" value={editForm.val_base} onChange={e => setEditForm(prev => ({...prev, val_base: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Quantidade</label>
                        <input type="number" value={editForm.qtd_mat} onChange={e => setEditForm(prev => ({...prev, qtd_mat: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Lote</label>
                        <input type="text" value={editForm.ds_lote} onChange={e => setEditForm(prev => ({...prev, ds_lote: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Validade</label>
                        <input type="date" value={editForm.dt_validade} onChange={e => setEditForm(prev => ({...prev, dt_validade: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Observações</label>
                      <textarea value={editForm.ds_obs} onChange={e => setEditForm(prev => ({...prev, ds_obs: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" rows={3}></textarea>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                      <button type="button" onClick={handleUpdateAnuncio} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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

                  <div className="mt-8 flex gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setIsDetailsOpen(false); setConfirmAction("none"); setIsEditing(false); }}
                      className="flex-1 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                    {selectedAnuncio.ie_status !== 'N' && selectedAnuncio.ie_status !== 'F' && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex-1 px-4 py-2.5 bg-blue-50 text-blue-900 rounded-xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Pencil size={16} />
                        Editar Anúncio
                      </button>
                    )}
                    {selectedAnuncio.ie_status === 'N' && (
                      <button
                        type="button"
                        onClick={() => router.push("/caixa-de-propostas")}
                        className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20"
                      >
                        <Handshake size={16} />
                        Propostas Recebidas
                      </button>
                    )}
                    {(selectedAnuncio.ie_status === 'I' || selectedAnuncio.ie_status === 'S') && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("activate")}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {isSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Tag size={16} />}
                        Ativar Anúncio
                      </button>
                    )}
                    {selectedAnuncio.ie_status === 'A' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("inactivate")}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <PackageX size={16} />}
                        Pausar Anúncio
                      </button>
                    )}
                    {selectedAnuncio.ie_status !== 'F' && selectedAnuncio.ie_status !== 'N' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("delete")}
                        className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Trash2 size={16} />
                        Excluir Anúncio
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
