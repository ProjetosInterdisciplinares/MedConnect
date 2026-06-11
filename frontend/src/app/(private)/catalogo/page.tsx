"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import servicesGetAnuncios from "@/server/(GET)-anuncios"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, PackageX, ShoppingCart, Building2, Package, Info, ChevronRight } from "lucide-react"
import { Anuncio, MatMed } from "@/types"
import { useRouter } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"


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
      <div className="min-h-screen bg-slate-50 w-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando catálogo de anúncios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full selection:bg-cyan-500/20 antialiased">
      <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* cabecalho e barra de pesquisa  */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-extrabold text-sky-800 tracking-tight">Catálogo de Insumos</h1>
            <p className="text-xs font-medium text-slate-500">
              Encontre medicamentos e produtos hospitalares disponíveis para compra!
            </p>
          </div>
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-cyan-600 transition-colors duration-200" />
            <Input
              placeholder="Buscar por produto, fabricante, ID..."
              className="pl-11 h-11 bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-600 text-slate-800 placeholder:text-slate-400 rounded-xl transition-all duration-200 text-sm"
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
              const anunciante = (anuncio as any).nm_vendedor || (anuncio as any).ds_empresa || "Distribuidora Hospitalar"
              
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
                <Card
                  key={anuncio.nr_anuncio}
                  className="group flex flex-col bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden"
                >
                  <div className="h-1 w-full bg-sky-800" />

                  <CardHeader className="p-5 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 max-w-[65%] truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={anunciante}>{anunciante}</span>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                        {statusLabel}
                      </span>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-800 leading-snug line-clamp-2 min-h-11 group-hover:text-sky-700  transition-colors duration-200">
                      {nomeMaterial}
                    </CardTitle>
                  </CardHeader>

                  <div className="h-px bg-slate-100 mx-5" />

                  <CardContent className="p-5 py-4 space-y-4 grow">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Valor Base para Negociação
                      </p>
                      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        R$ {Number((anuncio as any).val_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade</p>
                        <p className="text-sm font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {anuncio.qtd_mat} <span className="text-xs font-normal text-slate-500">un.</span>
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ref. Anúncio</p>
                        <p className="text-sm font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          #{anuncio.nr_anuncio}
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <div className="h-px bg-slate-100 mx-5" />

                  <CardFooter className="p-5 pt-4">
                    < Button
                      onClick={() => router.push(`/anunciar/${anuncio.nr_anuncio}`)}
                      className="w-full bg-sky-800 hover:bg-sky-900 text-white font-semibold rounded-xl h-11 transition-colors duration-200 flex items-center justify-center gap-2 group/btn shadow-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Ver Oferta
                      <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                    </Button>
                  </CardFooter>
                </Card>
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
                  className="mt-3 text-sky-600 p-0 h-auto text-xs font-bold hover:text-sky-700"
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