"use client"

import React, { useEffect, useState } from "react"
import { hojeISO } from "@/lib/format/hoje"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

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
  const [editForm, setEditForm] = useState({ val_base: "", ie_status: "", dt_validade: "", ds_lote: "", ds_obs: "", qtd_mat: "", val_minimo: "", ie_aceita_parcial: true })
  
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
    const validadeMudou = (editForm.dt_validade || "") !== (selectedAnuncio.dt_validade || "")
    if (validadeMudou && editForm.dt_validade && editForm.dt_validade < hojeISO()) {
      alert("Produto vencido: a validade não pode ser anterior a hoje.")
      return
    }
    if (editForm.val_minimo && Number(editForm.val_minimo) > Number(editForm.val_base)) {
      alert("O valor mínimo não pode ser maior que o valor base.")
      return
    }
    setIsSaving(true)
    try {
      const response = await servicesUpdateAnuncio(selectedAnuncio.nr_anuncio, {
        val_base: editForm.val_base,
        qtd_mat: Number(editForm.qtd_mat),
        ie_status: selectedAnuncio.ie_status as any,
        dt_validade: editForm.dt_validade || null,
        ds_lote: editForm.ds_lote || null,
        ds_obs: editForm.ds_obs || "",
        val_minimo: editForm.val_minimo || null,
        ie_aceita_parcial: editForm.ie_aceita_parcial,
      })
      if (response && "isError" in response) {
        alert("Erro ao salvar: " + response.message)
      } else {
        const updated = { ...selectedAnuncio, ...editForm, ie_status: selectedAnuncio.ie_status, val_base: Number(editForm.val_base), qtd_mat: Number(editForm.qtd_mat), val_minimo: editForm.val_minimo || null } as unknown as Anuncio
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
          Você ainda não publicou nenhum insumo no catálogo. Use a aba "Publicar" para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 items-start w-full">
      {/* Conteúdo */}
      <div className="flex-1 w-full min-w-0">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          {/* Header Interno com o filtro de status */}
          <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {TABS.find(t => t.id === statusFilter)?.label}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {TABS.find(t => t.id === statusFilter)?.description}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(String(v || "ALL"))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger
                  aria-label="Filtrar por status"
                  className="h-10 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <span className="truncate">
                    <span className="text-slate-500">Status:</span> {TABS.find(t => t.id === statusFilter)?.label}
                    <span className="ml-1.5 text-slate-400 tabular-nums">({filteredAnuncios.length})</span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <SelectItem key={id} value={id}>
                      <span className="flex w-full items-center gap-2">
                        <Icon size={14} className="text-slate-400" aria-hidden="true" />
                        <span className="flex-1">{label}</span>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {id === "ALL" ? anuncios.length : anuncios.filter((a) => a.ie_status === id).length}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        ds_obs: anuncio.ds_obs || "",
                        val_minimo: anuncio.val_minimo ? String(anuncio.val_minimo) : "",
                        ie_aceita_parcial: anuncio.ie_aceita_parcial !== false,
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
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white gap-0">
          {selectedAnuncio && (
            <>
              <DialogHeader className="m-0 px-6 pt-6 pb-0 bg-white rounded-none border-0">
                <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-semibold">
                  Detalhes do anúncio
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  Dados do lote publicado. Você pode editar, pausar ou excluir o anúncio.
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {selectedAnuncio.ie_status === 'S' && confirmAction === "none" && (
                  <div className="bg-amber-50 border border-amber-200 p-4 mb-6 rounded-lg flex gap-3">
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
                  <div className="flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900">
                      {confirmAction === 'delete' ? 'Excluir este anúncio?' : confirmAction === 'activate' ? 'Ativar este anúncio?' : 'Pausar este anúncio?'}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {confirmAction === 'delete' 
                        ? 'Esta ação é irreversível. O anúncio será permanentemente removido do catálogo e não poderá ser recuperado.' 
                        : confirmAction === 'activate' 
                        ? 'O anúncio voltará a ficar visível no catálogo de vendas para todos os compradores.' 
                        : 'O anúncio será ocultado do catálogo e ficará na sua lista de Inativos.'}
                    </p>
                    
                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmAction("none")}
                        disabled={isDeleting || isSaving}
                        className="h-10 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
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
                        className={`h-10 px-4 text-white rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'}`}
                      >
                        {isDeleting || isSaving ? (
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : confirmAction === 'delete' ? (
                          "Excluir anúncio"
                        ) : confirmAction === 'activate' ? (
                          "Ativar anúncio"
                        ) : (
                          "Pausar anúncio"
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
                        <input type="date" min={hojeISO()} value={editForm.dt_validade} onChange={e => setEditForm(prev => ({...prev, dt_validade: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor Mínimo Aceito</label>
                        <input type="number" step="0.01" min="0" placeholder="Opcional" value={editForm.val_minimo} onChange={e => setEditForm(prev => ({...prev, val_minimo: e.target.value}))} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-800" />
                      </div>
                      <label className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 accent-blue-700" checked={editForm.ie_aceita_parcial} onChange={e => setEditForm(prev => ({...prev, ie_aceita_parcial: e.target.checked}))} />
                        <span className="text-sm font-semibold text-slate-700">Aceito compra parcial</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Observações</label>
                      <textarea value={editForm.ds_obs} onChange={e => setEditForm(prev => ({...prev, ds_obs: e.target.value}))} className="w-full h-24 resize-none border border-slate-200 rounded-lg p-2.5 text-slate-800" rows={3}></textarea>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors">Cancelar</button>
                      <button type="button" onClick={handleUpdateAnuncio} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-6">
                    {/* Foto e Titulo */}
                    <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
                      <div className="w-32 h-32 shrink-0 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                        {selectedAnuncio.imagem_anuncio ? (
                          <img src={selectedAnuncio.imagem_anuncio} alt="Imagem" className="w-full h-full object-contain bg-white" />
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
                          <span className="text-2xl font-semibold">{Number(selectedAnuncio.val_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex gap-2 justify-center md:justify-start">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">Lote: {selectedAnuncio.ds_lote || "Não informado"}</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">Qtd: {selectedAnuncio.qtd_mat}</span>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes Secundários */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar size={14} />
                          <span className="text-xs font-semibold">Fabricação</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedAnuncio.dt_fabricacao ? new Date(selectedAnuncio.dt_fabricacao).toLocaleDateString("pt-BR") : "-"}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <AlertCircle size={14} />
                          <span className="text-xs font-semibold">Validade</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedAnuncio.dt_validade ? new Date(selectedAnuncio.dt_validade).toLocaleDateString("pt-BR") : "-"}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-500">Valor mínimo aceito</span>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedAnuncio.val_minimo ? Number(selectedAnuncio.val_minimo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não definido"}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-500">Compra parcial</span>
                        <span className="text-sm font-bold text-slate-800">
                          {selectedAnuncio.ie_aceita_parcial === false ? "Não aceita" : "Aceita"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col gap-2">
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
                      className="flex-1 h-10 px-3 text-sm whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                    {selectedAnuncio.ie_status !== 'N' && selectedAnuncio.ie_status !== 'F' && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex-1 h-10 px-3 text-sm whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    )}
                    {selectedAnuncio.ie_status === 'N' && (
                      <button
                        type="button"
                        onClick={() => router.push("/caixa-de-propostas")}
                        className="flex-1 h-10 px-3 text-sm whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                        className="flex-1 h-10 px-3 text-sm whitespace-nowrap bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Tag size={16} />}
                        Ativar
                      </button>
                    )}
                    {selectedAnuncio.ie_status === 'A' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("inactivate")}
                        disabled={isSaving}
                        className="flex-1 h-10 px-3 text-sm whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <PackageX size={16} />}
                        Pausar
                      </button>
                    )}
                    {selectedAnuncio.ie_status !== 'F' && selectedAnuncio.ie_status !== 'N' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction("delete")}
                        className="flex-1 h-10 px-3 text-sm whitespace-nowrap bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Trash2 size={16} />
                        Excluir
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
