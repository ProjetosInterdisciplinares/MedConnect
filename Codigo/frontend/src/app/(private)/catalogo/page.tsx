"use client"

import React, { useEffect, useState, useMemo } from "react"
import servicesGetAnuncios from "@/server/(GET)-anuncios"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands" 
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, PackageX, SlidersHorizontal, MapPin } from "lucide-react"
import { Anuncio, MatMed } from "@/types"
import { useRouter } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"
import AnimatedBackground from "@/components/ui/animated-background"
import { AuthManager } from "@/lib/AuthManager"

const ITEMS_PER_PAGE = 6;

export default function Anuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [loggedUserId, setLoggedUserId] = useState<number | null>(null)
  
  const [categoria, setCategoria] = useState("Todas")
  const [fabricanteFiltro, setFabricanteFiltro] = useState("")
  const [localizacaoFiltro, setLocalizacaoFiltro] = useState("")
  const [ordenacao, setOrdenacao] = useState("recentes")

  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const storedUserId = String(AuthManager.getInstance().getUserId())
        if (storedUserId) setLoggedUserId(Number(storedUserId))

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
    return new Map(materiais.map((m) => [m.cd_mat, m]))
  }, [materiais])

  const fabricantesUnicos = useMemo(() => {
    const fabs = new Set<string>()
    anuncios.forEach(a => {
      if (loggedUserId !== null && a.cd_pessoa_anunciante === loggedUserId) return;
      const materialObj = materiaisMap.get(a.cd_mat)
      const fab = String(materialObj?.ds_marca || (a as any).nm_fabricante || (a as any).ds_marca_mat || "Outros").trim()
      if (fab && fab !== "undefined") fabs.add(fab)
    })
    return Array.from(fabs).sort()
  }, [anuncios, loggedUserId, materiaisMap])

  const localizacoesUnicas = useMemo(() => {
    const locs = new Set<string>()
    anuncios.forEach(a => {
      if (loggedUserId !== null && a.cd_pessoa_anunciante === loggedUserId) return;
      // Usando o nome do anunciante como "localização" caso não exista cidade no banco
      const loc = String(a.anunciante_razao || (a as any).ds_cidade || (a as any).nm_cidade || "Desconhecida").trim()
      if (loc && loc !== "undefined") locs.add(loc)
    })
    return Array.from(locs).sort()
  }, [anuncios, loggedUserId])

  const filteredAnuncios = useMemo(() => {
    const term = search.toLowerCase().trim()
    let filtered = anuncios.filter((a) => {
      if (loggedUserId !== null && a.cd_pessoa_anunciante === loggedUserId) return false;

      const materialObj = materiaisMap.get(a.cd_mat)
      const nomeProduct = materialObj?.ds_mat?.toLowerCase() ?? ""
      const tipoProduct = materialObj?.ds_tipo ?? ""
      const vendedor = String((a as any).nm_vendedor || (a as any).ds_empresa || (a as any).anunciante_razao || "").toLowerCase()
      const nrAnuncio = a.nr_anuncio?.toString() || ""
      const fabricante = String(materialObj?.ds_marca || (a as any).nm_fabricante || (a as any).ds_marca_mat || "Outros").toLowerCase()
      const cidade = String(a.anunciante_razao || (a as any).ds_cidade || (a as any).nm_cidade || "Desconhecida").toLowerCase()
      
      const matchesSearch = (
        nrAnuncio.includes(term) ||
        nomeProduct.includes(term) ||
        vendedor.includes(term) ||
        fabricante.includes(term)
      )

      const matchesFabricante = !fabricanteFiltro || fabricante.includes(fabricanteFiltro.toLowerCase())
      const matchesLocalizacao = !localizacaoFiltro || cidade.includes(localizacaoFiltro.toLowerCase())
      
      const matchesCategoria = 
        categoria === "Todas" || 
        (categoria === "Medicamentos" && tipoProduct === "MD01") ||
        (categoria === "Materiais Hospitalares" && tipoProduct === "MT01");

      return matchesSearch && matchesFabricante && matchesLocalizacao && matchesCategoria
    })
    
    // Ordenação básica se a API retornou campos úteis
    if (ordenacao === "recentes") {
      filtered = filtered.sort((a, b) => b.nr_anuncio - a.nr_anuncio)
    } else if (ordenacao === "antigos") {
      filtered = filtered.sort((a, b) => a.nr_anuncio - b.nr_anuncio)
    }

    return filtered;
  }, [anuncios, materiaisMap, search, fabricanteFiltro, localizacaoFiltro, loggedUserId, categoria, ordenacao])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAnuncios.length / ITEMS_PER_PAGE) || 1
  }, [filteredAnuncios])

  const paginatedAnuncios = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAnuncios.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAnuncios, currentPage])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent w-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando catálogo de anúncios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent w-full selection:bg-blue-500/20 antialiased relative">
      <AnimatedBackground />
      <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Título da página */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">Catálogo de Insumos</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {filteredAnuncios.length} anúncios disponíveis
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filtros */}
          <aside className="w-full lg:w-[260px] shrink-0 bg-white p-6 rounded-2xl shadow-sm h-fit space-y-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              Filtros
            </div>

            {/* Categoria */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Categoria</h3>
              <div className="space-y-3">
                {["Todas", "Medicamentos", "Materiais Hospitalares"].map((cat) => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="categoria"
                        value={cat}
                        checked={categoria === cat}
                        onChange={(e) => { setCategoria(e.target.value); setCurrentPage(1); }}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 rounded-full border border-slate-300 peer-checked:border-blue-600 flex items-center justify-center transition-colors bg-white">
                        <div className={`w-2 h-2 rounded-full bg-blue-600 transition-transform ${categoria === cat ? 'scale-100' : 'scale-0'}`} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 font-medium group-hover:text-blue-700 transition-colors">
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fabricante */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-700 block">Fabricante</label>
              <div className="relative">
                <Select
                  value={fabricanteFiltro || "todos"}
                  onValueChange={(val) => { setFabricanteFiltro((val === "todos" || !val) ? "" : val); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-xl h-10 shadow-sm">
                    <SelectValue placeholder="Todos os fabricantes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os fabricantes</SelectItem>
                    {fabricantesUnicos.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-700 block">Localização</label>
              <div className="relative">
                <Select
                  value={localizacaoFiltro || "todas"}
                  onValueChange={(val) => { setLocalizacaoFiltro((val === "todas" || !val) ? "" : val); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-xl h-10 shadow-sm">
                    <SelectValue placeholder="Todas as localizações..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as localizações...</SelectItem>
                    {localizacoesUnicas.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 w-full flex flex-col min-w-0">
            
            {/* Search bar and Sort */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar insumos, fabricantes..."
                  className="pl-11 h-11 bg-white border-0 shadow-sm text-slate-800 placeholder:text-slate-400 rounded-2xl transition-all duration-300 text-sm focus-visible:ring-2 focus-visible:ring-blue-500/30"
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={ordenacao} onValueChange={(val) => setOrdenacao(val || "recentes")}>
                  <SelectTrigger className="h-11 bg-white border-0 shadow-sm text-slate-700 font-medium rounded-2xl text-sm focus:ring-blue-500/30">
                    <SelectValue placeholder="Mais recentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Mais recentes</SelectItem>
                    <SelectItem value="antigos">Mais antigos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* display dos anuncios */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedAnuncios.length > 0 ? (
                paginatedAnuncios.map((anuncio) => {
                  const materialObj = materiaisMap.get(anuncio.cd_mat)
                  const nomeMaterial = materialObj?.ds_mat ?? "Material não identificado"
                  const fabricante = materialObj?.ds_marca || (anuncio as any).nm_fabricante || (anuncio as any).ds_marca_mat || "Fabricante não informado"
                  const anunciante = (anuncio as any).anunciante_razao || (anuncio as any).nm_vendedor || (anuncio as any).ds_empresa || "Usuário"
                  const lote = anuncio.ds_lote || "Não informado"
                  
                  let dataValidade = "Não informada"
                  const rawValidade = anuncio.dt_validade
                  
                  if (rawValidade) {
                     const dateObj = new Date(rawValidade)
                     if (!isNaN(dateObj.getTime())) {
                        dataValidade = dateObj.toLocaleDateString('pt-BR')
                     }
                  }

                  return (
                    <div
                      key={anuncio.nr_anuncio}
                      onClick={() => router.push(`/anunciar/${anuncio.nr_anuncio}`)}
                      className="bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col cursor-pointer border border-transparent hover:border-blue-100 relative overflow-hidden group"
                    >
                      {/* Hover Top Bar */}
                      <div className="absolute top-0 left-0 h-1.5 w-0 bg-blue-600 group-hover:w-full transition-all duration-500 ease-out" />

                      {/* Image Area */}
                      <div className="w-full aspect-square bg-slate-50/50 rounded-xl mb-4 flex items-center justify-center border border-slate-100 overflow-hidden relative">
                        {anuncio.imagem_anuncio ? (
                          <img 
                            src={anuncio.imagem_anuncio} 
                            alt={nomeMaterial} 
                            className="w-full h-full object-contain mix-blend-multiply p-2 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 opacity-60">
                            <PackageX className="w-10 h-10 mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sem foto</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Title & Subtitle */}
                      <div className="mb-3">
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors text-[17px] leading-tight mb-1 line-clamp-2" title={nomeMaterial}>
                          {nomeMaterial}
                        </h3>
                        <p className="text-slate-500 text-sm truncate" title={fabricante}>
                          {fabricante}
                        </p>
                      </div>

                      {/* Preço */}
                      <div className="mb-5 flex items-baseline gap-1">
                        <span className="text-sm font-bold text-blue-700">R$</span>
                        <span className="text-[26px] font-extrabold text-blue-700 tracking-tight leading-none">
                          {Number((anuncio as any).val_base || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Info Table */}
                      <div className="space-y-3 text-xs text-slate-500 mt-auto mb-5">
                        <div className="flex justify-between items-center">
                          <span>Lote</span>
                          <span className="font-medium text-slate-700">{lote}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Validade</span>
                          <span className="font-medium text-slate-700">{dataValidade}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Qtd.</span>
                          <span className="font-medium text-slate-700">{anuncio.qtd_mat} unidades</span>
                        </div>
                      </div>

                      {/* Footer (Location / User) */}
                      <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-700 bg-white">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate" title={anunciante}>{anunciante}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl shadow-sm px-6">
                  <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <PackageX className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Nenhum anúncio encontrado</h3>
                  <p className="text-slate-500 max-w-sm mt-2 text-sm">
                    Não localizamos registros correspondentes para seus filtros de busca.
                  </p>
                </div>
              )}
            </div>

            {/* paginacao no rodape da pagina */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAnuncios.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  )
}