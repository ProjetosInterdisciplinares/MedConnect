"use client"

import React, { useEffect, useState, useMemo } from "react"
import servicesGetAnuncios from "@/server/(GET)-anuncios"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, PackageX, ShoppingCart, Building2, Package, Info, ChevronRight } from "lucide-react"
import { Anuncio, MatMed } from "@/types"
import { useRouter } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"
import AnimatedBackground from "@/components/ui/animated-background"


const ITEMS_PER_PAGE = 12;

export default function Anuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const [anunciosResult, materiaisResult] = await Promise.all([
          servicesGetAnuncios(0),
          servicesGetMaterials(),
        ])

        if (Array.isArray(anunciosResult)) setAnuncios(anunciosResult)
        if (Array.isArray(materiaisResult)) setMateriais(materiaisResult)
      } catch (error) {
        console.error("Erro ao buscar dados do catálogo:", error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const materiaisMap = useMemo(() => {
    return new Map(materiais.map((m) => [m.cd_mat, m.ds_mat]))
  }, [materiais])

  const filteredAnuncios = useMemo(() => {
    const term = search.toLowerCase().trim()
    return anuncios.filter((a) => {
      const nomeProduct = materiaisMap.get(a.cd_mat)?.toLowerCase() ?? ""
      const vendedor = String((a as any).nm_vendedor || (a as any).ds_empresa || "").toLowerCase()
      const nrAnuncio = a.nr_anuncio?.toString() || ""
      const fabricante = String((a as any).ds_marca || (a as any).nm_fabricante || (a as any).ds_marca_mat || "").toLowerCase()
      
      return (
        nrAnuncio.includes(term) ||
        nomeProduct.includes(term) ||
        vendedor.includes(term) ||
        fabricante.includes(term)
      )
    })
  }, [anuncios, materiaisMap, search])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAnuncios.length / ITEMS_PER_PAGE)
  }, [filteredAnuncios])

  const paginatedAnuncios = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAnuncios.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAnuncios, currentPage])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent w-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando catálogo de anúncios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent w-full selection:bg-teal-500/20 antialiased relative">
      <AnimatedBackground />
      <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">

        {/* cabecalho e barra de pesquisa  */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 p-6 sm:p-8 rounded-3xl shadow-lg border border-teal-900/10"
          style={{ background: "linear-gradient(135deg, #042f2e 0%, #0f766e 100%)" }}
        >
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black text-white tracking-tight">Catálogo de Insumos</h1>
            <p className="text-sm font-medium text-teal-100/80">
              Encontre medicamentos e produtos hospitalares disponíveis para compra!
            </p>
          </div>
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-teal-600 transition-colors duration-200" />
            <Input
              placeholder="Buscar por produto, fabricante, ID..."
              className="pl-11 h-11 bg-white border-white/20 focus-visible:ring-4 focus-visible:ring-teal-500/30 focus-visible:border-teal-400 text-slate-800 placeholder:text-slate-400 rounded-xl transition-all duration-300 text-sm shadow-inner"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* display dos anuncios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-3">
          {paginatedAnuncios.length > 0 ? (
            paginatedAnuncios.map((anuncio) => {
              const nomeMaterial = materiaisMap.get(anuncio.cd_mat) ?? "Material não identificado"
              const anunciante = anuncio.anunciante_razao || "Distribuidora Hospitalar"
              
              let statusLabel = "Inativo"
              let statusColor = "bg-slate-100 text-slate-700 border-slate-200"
              let statusDot = "bg-slate-400"

              if (anuncio.ie_status === "A") {
                statusLabel = "Ativo"
                statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200"
                statusDot = "bg-emerald-500"
              } else if (anuncio.ie_status === "F") {
                statusLabel = "Finalizado"
                statusColor = "bg-amber-50 text-amber-700 border-amber-200"
                statusDot = "bg-amber-500"
              }

              return (
                <div
                  key={anuncio.nr_anuncio}
                  className="group flex flex-col bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-teal-900/10 hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden"
                >
                  {/* Cabeçalho Verde: Nome + ID */}
                  <div className="w-full bg-teal-700 px-4 py-3 flex items-start justify-between gap-3 shrink-0 border-b border-teal-800">
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                      {nomeMaterial}
                    </h3>
                    <span className="text-teal-200/80 text-xs font-bold shrink-0 mt-0.5">
                      #{anuncio.nr_anuncio}
                    </span>
                  </div>

                  {/* Razão Social + Status */}
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 max-w-[65%] truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" title={anunciante}>{anunciante}</span>
                    </div>
                    
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                      {statusLabel}
                    </span>
                  </div>

                  {/* Área da imagem (Sempre presente para travar altura) */}
                  <div className="w-full h-44 bg-zinc-100 border-b border-slate-100 shrink-0 relative overflow-hidden flex items-center justify-center">
                    {anuncio.imagem_anuncio ? (
                      <img 
                        src={anuncio.imagem_anuncio} 
                        alt={nomeMaterial} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 opacity-60">
                        <PackageX className="w-10 h-10 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo: Preço e Quantidade */}
                  <div className="p-4 py-4 space-y-3 grow flex flex-col justify-center">
                    <div className="flex flex-col mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Valor Base
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-teal-700">R$</span>
                        <span className="text-3xl font-extrabold text-teal-700 tracking-tight">
                          {Number((anuncio as any).val_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100/50">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <Package className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600/80">Quantidade Disponível</p>
                        <p className="text-sm font-bold text-teal-900">{anuncio.qtd_mat} un.</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 mx-4" />

                  {/* Botão de Ação */}
                  <div className="p-4 pt-3 shrink-0">
                    <Button
                      onClick={() => router.push(`/anunciar/${anuncio.nr_anuncio}`)}
                      className="w-full text-white font-bold rounded-xl h-11 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-md hover:shadow-lg"
                      style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
                    >
                      <ShoppingCart className="w-4 h-4 group-hover/btn:-rotate-12 transition-transform duration-300" />
                      Ver Oferta
                      <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-3 bg-slate-50 rounded-full mb-3">
                <PackageX className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Nenhum anúncio encontrado</h3>
              <p className="text-slate-500 max-w-sm mt-1 text-xs">
                Não localizamos registros correspondentes para <span className="font-semibold text-slate-700">"{search}"</span>.
              </p>
              {search && (
                <Button
                  variant="link"
                  onClick={() => { setSearch(""); setCurrentPage(1); }}
                  className="mt-3 text-teal-600 p-0 h-auto text-xs font-bold hover:text-teal-700"
                >
                  Limpar filtros de busca
                </Button>
              )}
            </div>
          )}
        </div>

        {/* paginacao no rodape da pagina */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAnuncios.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />

      </div>
    </div>
  )
}