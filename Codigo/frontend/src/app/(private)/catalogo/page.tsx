"use client"

import React, { useEffect, useState, useMemo, useRef } from "react"
import servicesGetAnuncios from "@/server/(GET)-anuncios"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import servicesRegistrarInteresse from "@/server/(POST)-registrar-interesse"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, PackageX, SlidersHorizontal, MapPin, Sparkles, X, RotateCcw } from "lucide-react"
import { Anuncio, MatMed, PessoaJuridica } from "@/types"
import { useRouter, useSearchParams } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"
import { AuthManager } from "@/lib/AuthManager"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsStuck } from "@/hooks/useIsStuck"
import { SearchAndSort } from "@/components/catalogo/SearchAndSort"

// Quantidade de anúncios por página (9 itens compõe perfeitamente o grid 3x3 do conceito visual)
const ITEMS_PER_PAGE = 9

/**
 * Calcula a distância em quilômetros entre duas coordenadas geográficas (Fórmula de Haversine).
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function CatalogoPage() {
  /* ─────────────────────────────────────────────────────────────
   * ESTADOS PRINCIPAIS (Dados, busca, filtros e paginação)
   * ───────────────────────────────────────────────────────────── */
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [loggedUserId, setLoggedUserId] = useState<number | null>(null)
  const [meuPerfil, setMeuPerfil] = useState<PessoaJuridica | null>(null)

  // Filtros da barra lateral
  const [categoria, setCategoria] = useState("Todas")
  const [fabricanteFiltro, setFabricanteFiltro] = useState("")
  const searchParams = useSearchParams()
  const initialAnunciante = searchParams.get("anunciante") || ""
  const [anuncianteFiltro, setAnuncianteFiltro] = useState(initialAnunciante)
  const [distanciaMax, setDistanciaMax] = useState<string>("Todas")
  const [precoMin, setPrecoMin] = useState("")
  const [precoMax, setPrecoMax] = useState("")
  const [ordenacao, setOrdenacao] = useState("Recentes")

  // Estado para visualização de mapa em modal
  const [selectedMapAnuncio, setSelectedMapAnuncio] = useState<Anuncio | null>(null)

  // Controle de responsividade para filtros no mobile e tablet
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Paginação e navegação
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Detecção de sticky card com IntersectionObserver
  const { isStuck, sentinelRef } = useIsStuck()
  const mainSearchInputRef = useRef<HTMLInputElement | null>(null)
  const stickySearchInputRef = useRef<HTMLInputElement | null>(null)

  // Preserva o foco e posição do cursor caso o usuário esteja digitando durante a transição
  useEffect(() => {
    const activeEl = typeof document !== "undefined" ? document.activeElement : null
    const wasMainFocused = activeEl === mainSearchInputRef.current
    const wasStickyFocused = activeEl === stickySearchInputRef.current

    if (isStuck && wasMainFocused) {
      const start = mainSearchInputRef.current?.selectionStart ?? null
      const end = mainSearchInputRef.current?.selectionEnd ?? null
      requestAnimationFrame(() => {
        if (stickySearchInputRef.current) {
          stickySearchInputRef.current.focus()
          if (start !== null && end !== null) {
            stickySearchInputRef.current.setSelectionRange(start, end)
          }
        }
      })
    } else if (!isStuck && wasStickyFocused) {
      const start = stickySearchInputRef.current?.selectionStart ?? null
      const end = stickySearchInputRef.current?.selectionEnd ?? null
      requestAnimationFrame(() => {
        if (mainSearchInputRef.current) {
          mainSearchInputRef.current.focus()
          if (start !== null && end !== null) {
            mainSearchInputRef.current.setSelectionRange(start, end)
          }
        }
      })
    }
  }, [isStuck])

  /* ─────────────────────────────────────────────────────────────
   * CARREGAMENTO INICIAL DE DADOS
   * ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const storedUserId = String(AuthManager.getInstance().getUserId())
        if (storedUserId) setLoggedUserId(Number(storedUserId))

        const [anunciosResult, materiaisResult, perfilResult] = await Promise.all([
          servicesGetAnuncios(0),
          servicesGetMaterials(),
          servicesGetMinhaPessoaJuridica(),
        ])

        if (Array.isArray(anunciosResult)) setAnuncios(anunciosResult)
        if (Array.isArray(materiaisResult)) setMateriais(materiaisResult)
        if (perfilResult && !("isError" in perfilResult)) {
          setMeuPerfil(perfilResult as PessoaJuridica)
        }
      } catch (error) {
        console.error("Erro ao carregar dados do catálogo:", error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  /* ─────────────────────────────────────────────────────────────
   * MEMOS E TRATAMENTO DE FILTROS
   * ───────────────────────────────────────────────────────────── */
  // Dicionário de materiais por código para lookup rápido O(1)
  const materiaisMap = useMemo(() => {
    return new Map(materiais.map((m) => [m.cd_mat, m]))
  }, [materiais])

  // Lista única e ordenada de fabricantes existentes nos anúncios
  const fabricantesUnicos = useMemo(() => {
    const fabs = new Set<string>()
    anuncios.forEach((a) => {
      if (loggedUserId !== null && a.cd_pessoa_anunciante === loggedUserId) return
      const materialObj = materiaisMap.get(a.cd_mat)
      const fab = String(
        materialObj?.ds_marca ||
        (a as any).nm_fabricante ||
        (a as any).ds_marca_mat ||
        "Outros"
      ).trim()
      if (fab && fab !== "undefined") fabs.add(fab)
    })
    return Array.from(fabs).sort()
  }, [anuncios, loggedUserId, materiaisMap])

  // Filtragem e ordenação dos anúncios
  const filteredAnuncios = useMemo(() => {
    const term = appliedSearch.toLowerCase().trim()
    let filtered = anuncios.filter((a) => {
      // Ignora anúncios publicados pela própria instituição logada
      if (loggedUserId !== null && a.cd_pessoa_anunciante === loggedUserId) return false

      const materialObj = materiaisMap.get(a.cd_mat)
      const nomeProduct = materialObj?.ds_mat?.toLowerCase() ?? ""
      const tipoProduct = materialObj?.ds_tipo ?? ""
      const vendedor = String(
        (a as any).nm_vendedor || (a as any).ds_empresa || (a as any).anunciante_razao || ""
      ).toLowerCase()
      const nrAnuncio = a.nr_anuncio?.toString() || ""
      const fabricante = String(
        materialObj?.ds_marca || (a as any).nm_fabricante || (a as any).ds_marca_mat || "Outros"
      ).toLowerCase()
      const anuncianteStr = String(
        a.anunciante_razao || (a as any).nm_vendedor || (a as any).ds_empresa || ""
      ).toLowerCase()

      // Termo de busca
      const matchesSearch =
        nrAnuncio.includes(term) ||
        nomeProduct.includes(term) ||
        vendedor.includes(term) ||
        fabricante.includes(term)

      // Filtro de fabricante
      const matchesFabricante =
        !fabricanteFiltro || fabricante.includes(fabricanteFiltro.toLowerCase())

      // Filtro de anunciante
      const matchesAnunciante =
        !anuncianteFiltro || anuncianteStr.includes(anuncianteFiltro.toLowerCase())

      // Filtro de categoria
      const matchesCategoria =
        categoria === "Todas" ||
        (categoria === "Medicamentos" &&
          (tipoProduct === "MD01" || tipoProduct.toLowerCase() === "medicamento")) ||
        (categoria === "Materiais Hospitalares" &&
          (tipoProduct === "MT01" || tipoProduct.toLowerCase() === "material hospitalar"))

      // Filtro de preço mínimo e máximo
      const valBase = Number((a as any).val_base || 0)
      const matchesPrecoMin = precoMin === "" || valBase >= Number(precoMin)
      const matchesPrecoMax = precoMax === "" || valBase <= Number(precoMax)

      // Filtro por raio de distância geográfica
      let matchesDistancia = true
      if (
        distanciaMax !== "Todas" &&
        meuPerfil?.latitude &&
        meuPerfil?.longitude &&
        a.anunciante_lat &&
        a.anunciante_lon
      ) {
        const d = getDistance(
          Number(meuPerfil.latitude),
          Number(meuPerfil.longitude),
          Number(a.anunciante_lat),
          Number(a.anunciante_lon)
        )
        matchesDistancia = d <= Number(distanciaMax)
      } else if (distanciaMax !== "Todas") {
        matchesDistancia = false
      }

      return (
        matchesSearch &&
        matchesFabricante &&
        matchesAnunciante &&
        matchesCategoria &&
        matchesPrecoMin &&
        matchesPrecoMax &&
        matchesDistancia
      )
    })

    // Ordenação dos resultados
    if (ordenacao === "recentes" || ordenacao === "Recentes") {
      let recomendados = filtered.filter((a) => a.is_recommended)
      let normais = filtered.filter((a) => !a.is_recommended)

      // Limita até 6 recomendados no topo da vitrine
      if (recomendados.length > 6) {
        const extras = recomendados.slice(6).map((item) => ({ ...item, is_recommended: false }))
        normais = [...normais, ...extras]
        recomendados = recomendados.slice(0, 6)
      }

      normais = normais.sort((a, b) => b.nr_anuncio - a.nr_anuncio)
      filtered = [...recomendados, ...normais]
    } else if (ordenacao === "antigos" || ordenacao === "Antigos") {
      filtered = filtered.sort((a, b) => a.nr_anuncio - b.nr_anuncio)
    } else if (ordenacao === "preco_menor" || ordenacao === "Menor preço") {
      filtered = filtered.sort(
        (a, b) => Number((a as any).val_base || 0) - Number((b as any).val_base || 0)
      )
    } else if (ordenacao === "preco_maior" || ordenacao === "Maior preço") {
      filtered = filtered.sort(
        (a, b) => Number((b as any).val_base || 0) - Number((a as any).val_base || 0)
      )
    }

    return filtered
  }, [
    anuncios,
    materiaisMap,
    appliedSearch,
    fabricanteFiltro,
    anuncianteFiltro,
    distanciaMax,
    meuPerfil,
    loggedUserId,
    categoria,
    ordenacao,
    precoMin,
    precoMax,
  ])

  // Contagem de filtros ativos para badge e botão de reset
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (categoria !== "Todas") count++
    if (fabricanteFiltro) count++
    if (anuncianteFiltro) count++
    if (distanciaMax !== "Todas") count++
    if (precoMin !== "") count++
    if (precoMax !== "") count++
    return count
  }, [categoria, fabricanteFiltro, anuncianteFiltro, distanciaMax, precoMin, precoMax])

  // Limpa todos os filtros aplicados
  const handleClearFilters = () => {
    setCategoria("Todas")
    setFabricanteFiltro("")
    setAnuncianteFiltro("")
    setDistanciaMax("Todas")
    setPrecoMin("")
    setPrecoMax("")
    setCurrentPage(1)
  }

  // Paginação
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAnuncios.length / ITEMS_PER_PAGE) || 1
  }, [filteredAnuncios])

  const paginatedAnuncios = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAnuncios.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAnuncios, currentPage])

  // Manipulação da busca com debounce para persistência de interesse
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearch(term)
    setAppliedSearch(term.trim())
    setCurrentPage(1)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (term.trim().length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        triggerProfileUpdate(term.trim())
      }, 1500)
    }
  }

  const triggerProfileUpdate = (termo: string) => {
    servicesRegistrarInteresse(termo).catch((err) =>
      console.error("Erro ao registrar interesse:", err)
    )
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  /* ─────────────────────────────────────────────────────────────
   * ESTADO DE CARREGAMENTO (SPINNER)
   * ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 w-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium text-sm">Carregando catálogo de insumos...</p>
        </div>
      </div>
    )
  }

  return (
    /* ═══════════════════════════════════════════════════════════════
     * CONTAINER PRINCIPAL DA PÁGINA
     * Fundo limpo e suave em tom neutro sólido (#f4f6f9),
     * proporcionando contraste e foco nos cards de produtos
     * ═══════════════════════════════════════════════════════════════ */
    <div className="w-full px-3 sm:px-6 md:px-10 lg:pl-20 lg:pr-20 text-slate-800 selection:bg-blue-500/20 antialiased">
      <div className="w-full max-w-[1380px] mx-auto py-6 sm:py-10 px-0 sm:px-4 lg:px-8">

        {/* ═══════════════════════════════════════════════════════════════
         * 1. CABEÇALHO DA PÁGINA
         * Apresenta o título "Catálogo de Insumos" e o total de anúncios disponíveis,
         * com estilo limpo e tipografia moderna e elegante.
         * ═══════════════════════════════════════════════════════════════ */}
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-header tracking-tight">
            Catálogo de Insumos
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {filteredAnuncios.length} {filteredAnuncios.length === 1 ? "anúncio disponível" : "anúncios disponíveis"}
          </p>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
         * 2. CONTROLE RESPONSIVO DE FILTROS PARA MOBILE E TABLET
         * Em telas pequenas e médias (abaixo de 1024px), permite recolher/expandir
         * os filtros para não empurrar os produtos para baixo.
         * ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden mb-4">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="w-full flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <SlidersHorizontal className="w-4 h-4 text-brand-header" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-blue-700">
              {mobileFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
            </span>
          </button>
        </div>

        {/* Sentinela invisível para detecção de scroll/sticky com IntersectionObserver */}
        <div
          ref={sentinelRef}
          className="h-px w-full pointer-events-none opacity-0 -mb-px"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════
         * ESTRUTURA PRINCIPAL: SIDEBAR DE FILTROS + CONTEÚDO PRINCIPAL
         * ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row items-start gap-6">

          {/* ═══════════════════════════════════════════════════════════════
           * 3. SIDEBAR DE FILTROS
           * Painel lateral branco com cantos arredondados contendo:
           * - Busca & Ordenação (fixo no topo quando o card está stuck)
           * - Categoria (Radio buttons estilizados com ponto ativo)
           * - Fabricante (Dropdown com seleção de fabricantes)
           * - Localização / Distância Máxima
           * - Faixa de Preço (R$)
           * - Botão Limpar Filtros
           * Visível permanentemente no desktop e colapsável no mobile/tablet.
           * ═══════════════════════════════════════════════════════════════ */}
          <aside
            style={{
              top: "calc(var(--navbar-height, 64px) + var(--sticky-gap, 16px))",
              maxHeight: "calc(100vh - var(--navbar-height, 64px) - var(--sticky-gap, 16px) * 2)",
            }}
            className={`w-full lg:w-64 xl:w-72 shrink-0 bg-white p-5 sm:p-6 rounded-2xl border transition-all duration-200 sticky z-30 overflow-y-auto ${mobileFiltersOpen ? "block" : "hidden lg:block"
              } ${isStuck
                ? "border-slate-300 shadow-md ring-1 ring-slate-900/5"
                : "border-slate-200/80 shadow-xs"
              }`}
          >
            {/* ── BARRA DE BUSCA E ORDENAÇÃO FIXA (Exibida apenas quando 'stuck') ── */}
            <div
              className={`transition-all duration-200 ease-out motion-reduce:transition-none overflow-hidden ${isStuck
                ? "max-h-56 opacity-100 pb-4 mb-4 border-b border-slate-100"
                : "max-h-0 opacity-0 pointer-events-none"
                }`}
              aria-hidden={!isStuck}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Busca &amp; Ordenação
              </div>
              <SearchAndSort
                ref={stickySearchInputRef}
                idPrefix="sticky"
                search={search}
                onSearchChange={handleSearchChange}
                onClearSearch={() => {
                  setSearch("")
                  setAppliedSearch("")
                  setCurrentPage(1)
                }}
                ordenacao={ordenacao}
                onOrdenacaoChange={(val) => setOrdenacao(val || "Recentes")}
                variant="compact"
              />
            </div>
            {/* Cabeçalho dos Filtros */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                <span>Filtros</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-800 cursor-pointer transition-colors"
                  title="Redefinir todos os filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>

            {/* Grupo de Filtro 1: Categoria */}
            <div className="py-4 border-b border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Categoria
              </h3>
              <div className="space-y-2.5">
                {["Todas", "Medicamentos", "Materiais Hospitalares"].map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-3 cursor-pointer group select-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="categoria"
                        value={cat}
                        checked={categoria === cat}
                        onChange={(e) => {
                          setCategoria(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 rounded-full border border-slate-300 peer-checked:border-blue-600 flex items-center justify-center transition-colors bg-white">
                        <div
                          className={`w-2 h-2 rounded-full bg-blue-600 transition-transform ${categoria === cat ? "scale-100" : "scale-0"
                            }`}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-xs transition-colors ${categoria === cat
                        ? "text-slate-900 font-semibold"
                        : "text-slate-600 group-hover:text-slate-900"
                        }`}
                    >
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Grupo de Filtro 2: Fabricante */}
            <div className="py-4 border-b border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Fabricante
              </label>
              <Select
                value={fabricanteFiltro || "Todos"}
                onValueChange={(val) => {
                  setFabricanteFiltro(!val || val === "Todos" ? "" : val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="hover:cursor-pointer w-full bg-white border border-slate-200/90 text-slate-700 text-xs font-medium rounded-xl h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder="Todos os fabricantes" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="Todos">Todos os fabricantes</SelectItem>
                  {fabricantesUnicos.map((fab) => (
                    <SelectItem className="hover:cursor-pointer" key={fab} value={fab}>
                      {fab}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grupo de Filtro 3: Localização / Distância */}
            <div className="py-4 border-b border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Distância Máxima
              </label>
              <Select
                value={distanciaMax}
                onValueChange={(val) => {
                  setDistanciaMax(val || "Todas")
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="hover:cursor-pointer w-full bg-white border border-slate-200/90 text-slate-700 text-xs font-medium rounded-xl h-10 shadow-xs focus:ring-2 focus:ring-blue-500/20">
                  <SelectValue placeholder="Qualquer distância" />
                </SelectTrigger>
                <SelectContent className="hover:cursor-pointer max-h-60">
                  <SelectItem className="hover:cursor-pointer" value="Todas">Qualquer distância</SelectItem>
                  <SelectItem className="hover:cursor-pointer" value="5">Até 5 km</SelectItem>
                  <SelectItem className="hover:cursor-pointer" value="10">Até 10 km</SelectItem>
                  <SelectItem className="hover:cursor-pointer" value="50">Até 50 km</SelectItem>
                  <SelectItem className="hover:cursor-pointer" value="100">Até 100 km</SelectItem>
                  <SelectItem className="hover:cursor-pointer" value="500">Até 500 km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grupo de Filtro 4: Faixa de Preço */}
            <div className="pt-4 space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Faixa de Preço (R$)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={precoMin}
                  onChange={(e) => {
                    setPrecoMin(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full bg-white border border-slate-200/90 text-slate-700 text-xs font-medium rounded-xl h-10 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  min={0}
                />
                <span className="text-slate-400 text-xs font-bold">-</span>
                <Input
                  type="number"
                  placeholder="Máx"
                  value={precoMax}
                  onChange={(e) => {
                    setPrecoMax(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full bg-white border border-slate-200/90 text-slate-700 text-xs font-medium rounded-xl h-10 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  min={0}
                />
              </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════════════════════════════════
           * 4. ÁREA PRINCIPAL DE CONTEÚDO (Busca + Grid de Anúncios + Paginação)
           * ═══════════════════════════════════════════════════════════════ */}
          <main className="flex-1 w-full min-w-0 flex flex-col">

            {/* ─────────────────────────────────────────────────────────────
             * BARRA SUPERIOR: BUSCA E ORDENAÇÃO
             * Posicionados lado a lado no desktop e tablet horizontal,
             * e empilhados no mobile para máxima usabilidade.
             * Quando o card lateral está 'stuck', reserva o espaço para evitar layout shift.
             * ───────────────────────────────────────────────────────────── */}
            <div className="w-full mb-6 min-h-[40px]">
              <div
                className={`transition-opacity duration-200 ${isStuck ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                aria-hidden={isStuck}
              >
                <SearchAndSort
                  ref={mainSearchInputRef}
                  idPrefix="main"
                  search={search}
                  onSearchChange={handleSearchChange}
                  onClearSearch={() => {
                    setSearch("")
                    setAppliedSearch("")
                    setCurrentPage(1)
                  }}
                  ordenacao={ordenacao}
                  onOrdenacaoChange={(val) => setOrdenacao(val || "Recentes")}
                  variant="standard"
                />
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
             * 5. GRID DE CARDS DE ANÚNCIOS
             * Layout responsivo:
             * - Mobile (telas pequenas): 1 coluna
             * - Tablet: 2 colunas
             * - Desktop (lg/xl): 3 colunas
             * ───────────────────────────────────────────────────────────── */}
            {paginatedAnuncios.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {paginatedAnuncios.map((anuncio) => {
                  const materialObj = materiaisMap.get(anuncio.cd_mat)
                  const nomeMaterial = materialObj?.ds_mat ?? "Material não identificado"
                  const fabricante =
                    materialObj?.ds_marca ||
                    (anuncio as any).nm_fabricante ||
                    (anuncio as any).ds_marca_mat ||
                    "Fabricante não informado"
                  const anunciante =
                    (anuncio as any).anunciante_razao ||
                    (anuncio as any).nm_vendedor ||
                    (anuncio as any).ds_empresa ||
                    "Usuário"
                  const lote = anuncio.ds_lote || "Não informado"
                  const valBase = Number((anuncio as any).val_base || 0)

                  // Formatação de data de validade
                  let dataValidade = "Não informada"
                  if (anuncio.dt_validade) {
                    const dateObj = new Date(anuncio.dt_validade)
                    if (!isNaN(dateObj.getTime())) {
                      dataValidade = dateObj.toLocaleDateString("pt-BR")
                    }
                  }

                  // Distância calculada
                  const distanciaKm =
                    meuPerfil?.latitude &&
                      meuPerfil?.longitude &&
                      anuncio.anunciante_lat &&
                      anuncio.anunciante_lon
                      ? getDistance(
                        Number(meuPerfil.latitude),
                        Number(meuPerfil.longitude),
                        Number(anuncio.anunciante_lat),
                        Number(anuncio.anunciante_lon)
                      )
                      : null

                  return (
                    /* CARD INDIVIDUAL DO PRODUTO */
                    <div
                      key={anuncio.nr_anuncio}
                      onClick={() => {
                        if (nomeMaterial && nomeMaterial !== "Material não identificado") {
                          triggerProfileUpdate(nomeMaterial)
                        }
                        router.push(`/anunciar/${anuncio.nr_anuncio}`)
                      }}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer"
                    >
                      {/* Topo do Card: Imagem do Produto + Badge de Recomendação */}
                      <div className="h-44 sm:h-48 bg-slate-50/70 p-4 flex items-center justify-center relative border-b border-slate-100 overflow-hidden">
                        {/* Selo Recomendado */}
                        {anuncio.is_recommended && (
                          <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>Recomendado</span>
                          </div>
                        )}

                        {anuncio.imagem_anuncio ? (
                          <img
                            src={anuncio.imagem_anuncio}
                            alt={nomeMaterial}
                            className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <PackageX className="w-9 h-9 mb-1" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">
                              Sem foto
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Corpo do Card: Informações do Produto */}
                      <div className="p-4 flex-1 flex flex-col">
                        {/* Nome do Produto */}
                        <h3
                          className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1 mb-0.5"
                          title={nomeMaterial}
                        >
                          {nomeMaterial}
                        </h3>

                        {/* Fabricante */}
                        <p
                          className="text-xs text-slate-500 font-medium truncate mb-4"
                          title={fabricante}
                        >
                          {fabricante}
                        </p>

                        {/* Tabela de Detalhes Técnicos (Lote, Validade, Qtd.) */}
                        <div className="space-y-2 text-xs mb-4 mt-auto">
                          <div className="flex justify-between items-center text-slate-500">
                            <span className="text-slate-400">Lote</span>
                            <span className="font-semibold text-slate-700">{lote}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500">
                            <span className="text-slate-400">Validade</span>
                            <span className="font-semibold text-slate-700">{dataValidade}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500">
                            <span className="text-slate-400">Qtd.</span>
                            <span className="font-semibold text-slate-700">
                              {anuncio.qtd_mat} unidades
                            </span>
                          </div>
                        </div>

                        {/* Rodapé do Card: Localização e Preço em Destaque */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                          {/* Localização do Anunciante */}
                          <div
                            className="flex items-center gap-1.5 min-w-0 max-w-[60%] text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition-colors cursor-pointer"
                            onClick={(e) => {
                              if (anuncio.anunciante_lat && anuncio.anunciante_lon) {
                                e.stopPropagation()
                                setSelectedMapAnuncio(anuncio)
                              }
                            }}
                            title={
                              anuncio.anunciante_lat && anuncio.anunciante_lon
                                ? "Clique para ver no mapa"
                                : anunciante
                            }
                          >
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-blue-500" />
                            <span className="truncate">{anunciante}</span>
                            {distanciaKm !== null && (
                              <span className="text-slate-400 text-[10px] shrink-0">
                                ({distanciaKm.toFixed(0)} km)
                              </span>
                            )}
                          </div>

                          {/* Preço */}
                          <div className="text-right shrink-0">
                            <span className="text-lg font-extrabold text-brand-header tracking-tight">
                              R${" "}
                              {valBase.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ESTADO VAZIO (Nenhum anúncio encontrado) */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="p-4 bg-slate-50 rounded-full mb-3 text-slate-400">
                  <PackageX className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Nenhum anúncio encontrado</h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-sm mt-1 mb-4">
                  Não localizamos registros que correspondam aos filtros de busca aplicados.
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
             * 6. PAGINAÇÃO INFERIOR
             * Barra com navegação entre páginas (< Anterior, números, Próxima >)
             * e indicador de total de anúncios exibidos.
             * ───────────────────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAnuncios.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChange}
                />
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
       * 7. MODAL DE LOCALIZAÇÃO NO MAPA (Google Maps Embed)
       * Exibido quando o usuário clica na localização com coordenadas válidas.
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!selectedMapAnuncio}
        onOpenChange={(open) => !open && setSelectedMapAnuncio(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <MapPin className="w-5 h-5 text-blue-600" />
              Localização do Estabelecimento
            </DialogTitle>
          </DialogHeader>
          {selectedMapAnuncio &&
            selectedMapAnuncio.anunciante_lat &&
            selectedMapAnuncio.anunciante_lon && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-0.5">
                    {selectedMapAnuncio.anunciante_razao || "Anunciante"}
                  </span>
                  {selectedMapAnuncio.anunciante_logradouro &&
                    `${selectedMapAnuncio.anunciante_logradouro}, `}
                  {selectedMapAnuncio.anunciante_numero &&
                    `${selectedMapAnuncio.anunciante_numero} - `}
                  {selectedMapAnuncio.anunciante_bairro &&
                    `${selectedMapAnuncio.anunciante_bairro}, `}
                  {selectedMapAnuncio.anunciante_cidade} / {selectedMapAnuncio.anunciante_estado}
                </div>
                <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${selectedMapAnuncio.anunciante_lat},${selectedMapAnuncio.anunciante_lon}&hl=pt-BR&z=15&output=embed`}
                  />
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}