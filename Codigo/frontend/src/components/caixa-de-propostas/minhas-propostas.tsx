"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Package, Calendar, SendHorizontal, Loader2, X, XCircle, Tag, CheckCircle2, Clock, Ban } from "lucide-react"
import servicesGetMinhasPropostas from "@/server/(GET)-minhas-propostas"
import servicesGetMeusMaaterials from "@/server/(GET)-meus-materiais"
import servicesUpdateAnuncio from "@/server/(PUT)-anuncio"
import { Anuncio, MatMed } from "@/types"

export function PropostasTab() {
  const [propostas, setPropostas] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState("Todas")

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

  const propostasFiltradas = useMemo(() => {
    return propostas.filter((a) => {
      if (filtroStatus === "Todas") return true;
      if (filtroStatus === "Aguardando" && a.ie_status === "N") return true;
      if (filtroStatus === "Aprovada" && a.ie_status === "F") return true;
      if (filtroStatus === "Recusada" && a.ie_status === "A") return true;
      return false;
    });
  }, [propostas, filtroStatus])

  async function cancelarProposta(anuncio: Anuncio) {
    const result = await servicesUpdateAnuncio(anuncio.nr_anuncio, { ie_status: "A" })
    if (!(result as any)?.isError) window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-blue-900 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Carregando histórico...</p>
      </div>
    )
  }

  const FILTERS = [
    { label: "Todas", count: propostas.length, icon: null },
    { label: "Aguardando", count: propostas.filter(p => p.ie_status === "N").length, icon: Clock },
    { label: "Aprovada", count: propostas.filter(p => p.ie_status === "F").length, icon: CheckCircle2 },
    { label: "Recusada", count: propostas.filter(p => p.ie_status === "A").length, icon: Ban },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Interno */}
      <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Propostas Enviadas</h2>
          <p className="text-sm text-slate-500 mt-1">Acompanhe o status dos lances que você realizou.</p>
        </div>

        {/* Filtros */}
        {propostas.length > 0 && (
          <div className="flex bg-slate-100/80 p-1 rounded-xl">
            {FILTERS.map((f) => {
              const isActive = filtroStatus === f.label;
              const Icon = f.icon;
              return (
                <button
                  key={f.label}
                  onClick={() => setFiltroStatus(f.label)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {Icon && <Icon size={14} className={isActive ? "text-blue-900" : ""} />}
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
                  }`}>
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {propostasFiltradas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-100">
            <SendHorizontal className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-bold text-xl text-slate-700 mb-2">Sem histórico</h3>
          <p className="text-slate-500 text-base max-w-md">
            {filtroStatus === "Todas" 
              ? "Você ainda não enviou propostas para anúncios de outros usuários."
              : `Nenhuma proposta com o status "${filtroStatus}" encontrada.`}
          </p>
          {filtroStatus !== "Todas" && (
            <button 
              onClick={() => setFiltroStatus("Todas")}
              className="mt-6 px-5 py-2 bg-blue-50 text-blue-900 font-semibold rounded-xl hover:bg-blue-100 transition-colors"
            >
              Ver todas as propostas
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-slate-100">
            {propostasFiltradas.map((anuncio) => {
              const nomeMaterial = anuncio.material_nome ?? "Material não identificado"
              const valorExibido = anuncio.val_proposta || anuncio.val_base

              // Configurações visuais baseadas no status
              let statusConfig = {
                badgeBg: "bg-amber-50",
                badgeBorder: "border-amber-200",
                badgeText: "text-amber-700",
                icon: <Clock size={12} className="mr-1.5" />,
                label: "AGUARDANDO",
                rowBg: "hover:bg-amber-50/20"
              }

              if (anuncio.ie_status === "F") {
                statusConfig = {
                  badgeBg: "bg-emerald-50",
                  badgeBorder: "border-emerald-200",
                  badgeText: "text-emerald-700",
                  icon: <CheckCircle2 size={12} className="mr-1.5" />,
                  label: "APROVADA",
                  rowBg: "hover:bg-emerald-50/20"
                }
              } else if (anuncio.ie_status === "A") {
                statusConfig = {
                  badgeBg: "bg-rose-50",
                  badgeBorder: "border-rose-200",
                  badgeText: "text-rose-700",
                  icon: <Ban size={12} className="mr-1.5" />,
                  label: "RECUSADA / CANCELADA",
                  rowBg: "hover:bg-rose-50/20"
                }
              }

              return (
                <li key={anuncio.nr_anuncio} className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 transition-colors ${statusConfig.rowBg}`}>
                  {/* Left info */}
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                    <div className="hidden md:flex mt-1 w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-white items-center justify-center shrink-0 border border-slate-200 transition-colors">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ID #{anuncio.nr_anuncio}</span>
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.badgeBg} ${statusConfig.badgeBorder} ${statusConfig.badgeText}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-800 truncate pr-4">{nomeMaterial}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mt-2">
                        <span className="flex items-center gap-2 text-slate-600">
                          <Tag size={14} className="text-slate-400" />
                          <span className="font-medium">Qtd: {anuncio.qtd_mat}</span>
                        </span>
                        <span className="flex items-center gap-2 text-slate-500">
                          <Calendar size={14} className="text-slate-400" />
                          <span>Enviada em {anuncio.data_anuncio ?? "—"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right actions / pricing */}
                  <div className="flex items-center justify-between md:justify-end gap-8 pl-0 md:pl-6 md:border-l border-slate-100">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Seu Lance</span>
                      <span className={`font-black text-2xl tracking-tight ${anuncio.ie_status === "F" ? "text-emerald-600" : "text-slate-800"}`}>
                        {Number(valorExibido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 w-12 justify-end">
                      {anuncio.ie_status === 'N' && (
                        <button 
                          onClick={() => cancelarProposta(anuncio)} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                          title="Cancelar minha proposta"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}