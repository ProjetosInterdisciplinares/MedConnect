"use client"

import React, { useEffect, useState, useMemo, useRef } from "react"
import servicesGetAnuncios from "@/server/(GET)-anuncios"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import servicesRegistrarInteresse from "@/server/(POST)-registrar-interesse"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Search, PackageX, SlidersHorizontal, MapPin, Sparkles, X, ChevronDown, BellRing } from "lucide-react"
import { toast } from "sonner"
import servicesCreateAlerta from "@/server/(POST)-alerta"
import { Anuncio, MatMed, PessoaJuridica } from "@/types"
import { useRouter, useSearchParams } from "next/navigation"
import { Pagination } from "@/components/ui/pagination"
import { AuthManager } from "@/lib/AuthManager"
import { quantidadeComUnidade } from "@/lib/format/unidade"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// 12 itens: fecha linhas completas em grades de 2, 3 e 4 colunas
const ITEMS_PER_PAGE = 12

const CATEGORIAS = [
  { valor: "Todas", rotulo: "Todos" },
  { valor: "Medicamentos", rotulo: "Medicamentos" },
  { valor: "Materiais Hospitalares", rotulo: "Material hospitalar" },
]

const DISTANCIAS = [
  { valor: "Todas", rotulo: "Qualquer distância" },
  { valor: "5", rotulo: "Até 5 km" },
  { valor: "10", rotulo: "Até 10 km" },
  { valor: "50", rotulo: "Até 50 km" },
  { valor: "100", rotulo: "Até 100 km" },
  { valor: "500", rotulo: "Até 500 km" },
]

const ORDENACOES = ["Recentes", "Antigos", "Menor preço", "Maior preço"]

/** Distância em km entre duas coordenadas (Haversine). */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function diasAte(iso: string | null) {
  if (!iso) return null
  const alvo = new Date(iso.slice(0, 10) + "T00:00:00")
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function formatarData(iso: string | null) {
  if (!iso) return null
  const [a, m, d] = iso.slice(0, 10).split("-")
  return a && m && d ? `${d}/${m}/${a}` : null
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const CONTROLE = "h-9 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-slate-300 transition-colors"

export default function CatalogoPage() {
  /* ─── Dados ─── */
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedUserId, setLoggedUserId] = useState<number | null>(null)
  const [meuPerfil, setMeuPerfil] = useState<PessoaJuridica | null>(null)

  /* ─── Busca e filtros ─── */
  const [search, setSearch] = useState("")
  const [categoria, setCategoria] = useState("Todas")
  const [fabricanteFiltro, setFabricanteFiltro] = useState("")
  const searchParams = useSearchParams()
  const [anuncianteFiltro, setAnuncianteFiltro] = useState(searchParams.get("anunciante") || "")
  const [distanciaMax, setDistanciaMax] = useState("Todas")
  const [precoMin, setPrecoMin] = useState("")
  const [precoMax, setPrecoMax] = useState("")
  const [ordenacao, setOrdenacao] = useState("Recentes")
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const [selectedMapAnuncio, setSelectedMapAnuncio] = useState<Anuncio | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const storedUserId = AuthManager.getInstance().getUserId()
        if (storedUserId) setLoggedUserId(Number(storedUserId))
        const [anunciosResult, materiaisResult, perfilResult] = await Promise.all([
          servicesGetAnuncios(0),
          servicesGetMaterials(),
          servicesGetMinhaPessoaJuridica(),
        ])
        if (Array.isArray(anunciosResult)) setAnuncios(anunciosResult)
        if (Array.isArray(materiaisResult)) setMateriais(materiaisResult)
        if (perfilResult && !("isError" in perfilResult)) setMeuPerfil(perfilResult as PessoaJuridica)
      } catch (error) {
        console.error("Erro ao carregar dados do catálogo:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const materiaisMap = useMemo(() => new Map(materiais.map((m) => [m.cd_mat, m])), [materiais])

  // Anúncios de outras instituições (o catálogo não mostra os próprios)
  const anunciosDeTerceiros = useMemo(
    () => anuncios.filter((a) => loggedUserId === null || a.cd_pessoa_anunciante !== loggedUserId),
    [anuncios, loggedUserId],
  )

  const fabricantesUnicos = useMemo(() => {
    const fabs = new Set<string>()
    anunciosDeTerceiros.forEach((a) => {
      const fab = materiaisMap.get(a.cd_mat)?.ds_marca?.trim()
      if (fab) fabs.add(fab)
    })
    return Array.from(fabs).sort((x, y) => x.localeCompare(y, "pt-BR"))
  }, [anunciosDeTerceiros, materiaisMap])

  const distanciaDe = (a: Anuncio) =>
    meuPerfil?.latitude && meuPerfil?.longitude && a.anunciante_lat && a.anunciante_lon
      ? getDistance(Number(meuPerfil.latitude), Number(meuPerfil.longitude), Number(a.anunciante_lat), Number(a.anunciante_lon))
      : null

  const filteredAnuncios = useMemo(() => {
    const term = search.toLowerCase().trim()
    let filtered = anunciosDeTerceiros.filter((a) => {
      const mat = materiaisMap.get(a.cd_mat)
      const nome = mat?.ds_mat?.toLowerCase() ?? ""
      const tipo = (mat?.ds_tipo ?? "").toLowerCase()
      const fabricante = (mat?.ds_marca ?? "").toLowerCase()
      const anunciante = (a.anunciante_razao ?? "").toLowerCase()

      const matchesSearch = !term ||
        String(a.nr_anuncio).includes(term) || nome.includes(term) || anunciante.includes(term) || fabricante.includes(term)
      const matchesFabricante = !fabricanteFiltro || fabricante === fabricanteFiltro.toLowerCase()
      const matchesAnunciante = !anuncianteFiltro || anunciante.includes(anuncianteFiltro.toLowerCase())
      const matchesCategoria =
        categoria === "Todas" ||
        (categoria === "Medicamentos" && (tipo === "medicamento" || mat?.ds_tipo === "MD01")) ||
        (categoria === "Materiais Hospitalares" && (tipo === "material hospitalar" || mat?.ds_tipo === "MT01"))

      const valor = Number(a.val_base || 0)
      const matchesPreco = (precoMin === "" || valor >= Number(precoMin)) && (precoMax === "" || valor <= Number(precoMax))

      let matchesDistancia = true
      if (distanciaMax !== "Todas") {
        const d = distanciaDe(a)
        matchesDistancia = d !== null && d <= Number(distanciaMax)
      }

      return matchesSearch && matchesFabricante && matchesAnunciante && matchesCategoria && matchesPreco && matchesDistancia
    })

    if (ordenacao === "Recentes") {
      // Até 6 recomendados pela IA no topo; o restante por data de publicação
      let recomendados = filtered.filter((a) => a.is_recommended)
      let normais = filtered.filter((a) => !a.is_recommended)
      if (recomendados.length > 6) {
        normais = [...normais, ...recomendados.slice(6).map((item) => ({ ...item, is_recommended: false }))]
        recomendados = recomendados.slice(0, 6)
      }
      filtered = [...recomendados, ...normais.sort((a, b) => b.nr_anuncio - a.nr_anuncio)]
    } else if (ordenacao === "Antigos") {
      filtered = [...filtered].sort((a, b) => a.nr_anuncio - b.nr_anuncio)
    } else if (ordenacao === "Menor preço") {
      filtered = [...filtered].sort((a, b) => Number(a.val_base || 0) - Number(b.val_base || 0))
    } else if (ordenacao === "Maior preço") {
      filtered = [...filtered].sort((a, b) => Number(b.val_base || 0) - Number(a.val_base || 0))
    }
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anunciosDeTerceiros, materiaisMap, search, fabricanteFiltro, anuncianteFiltro, distanciaMax, meuPerfil, categoria, ordenacao, precoMin, precoMax])

  /* ─── Filtros ativos (chips) ─── */
  const chips = [
    categoria !== "Todas" && { rotulo: categoria, limpar: () => setCategoria("Todas") },
    fabricanteFiltro && { rotulo: `Fabricante: ${fabricanteFiltro}`, limpar: () => setFabricanteFiltro("") },
    anuncianteFiltro && { rotulo: `Vendedor: ${anuncianteFiltro}`, limpar: () => setAnuncianteFiltro("") },
    distanciaMax !== "Todas" && { rotulo: `Até ${distanciaMax} km`, limpar: () => setDistanciaMax("Todas") },
    (precoMin || precoMax) && {
      rotulo: precoMin && precoMax ? `${brl(Number(precoMin))} a ${brl(Number(precoMax))}` : precoMin ? `A partir de ${brl(Number(precoMin))}` : `Até ${brl(Number(precoMax))}`,
      limpar: () => { setPrecoMin(""); setPrecoMax("") },
    },
  ].filter(Boolean) as { rotulo: string; limpar: () => void }[]

  const handleClearFilters = () => {
    setCategoria("Todas")
    setFabricanteFiltro("")
    setAnuncianteFiltro("")
    setDistanciaMax("Todas")
    setPrecoMin("")
    setPrecoMax("")
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(filteredAnuncios.length / ITEMS_PER_PAGE) || 1
  const paginatedAnuncios = filteredAnuncios.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Busca com registro de interesse (alimenta as recomendações)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearch(term)
    setCurrentPage(1)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (term.trim().length > 2) {
      searchTimeoutRef.current = setTimeout(() => triggerProfileUpdate(term.trim()), 1500)
    }
  }

  const criarAlertaDaBusca = async () => {
    const resposta = await servicesCreateAlerta(search.trim())
    if ("isError" in resposta) {
      toast.error(resposta.message)
      return
    }
    toast.success(`Alerta criado para "${resposta.termo}"`, {
      description: "Avisaremos pelo sino quando surgir um anúncio compatível. Gerencie seus alertas no perfil.",
    })
  }

  const triggerProfileUpdate = (termo: string) => {
    servicesRegistrarInteresse(termo).catch((err) => console.error("Erro ao registrar interesse:", err))
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Altera um filtro e volta para a primeira página
  const comReset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setCurrentPage(1) }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-7 h-7 border-[3px] border-blue-700 border-t-transparent rounded-full animate-spin" aria-label="Carregando catálogo" />
      </div>
    )
  }

  /* ─── Controles de filtro (reaproveitados no desktop e no mobile) ─── */
  const filtroCategoria = (
    <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap xl:flex-nowrap items-center gap-x-5 gap-y-2 min-h-9 whitespace-nowrap">
      {CATEGORIAS.map((c) => (
        <label key={c.valor} className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="radio"
            name="categoria"
            value={c.valor}
            checked={categoria === c.valor}
            onChange={() => comReset(setCategoria)(c.valor)}
            className="w-4 h-4 accent-blue-700 cursor-pointer"
          />
          <span className={categoria === c.valor ? "font-medium text-slate-900" : "text-slate-600"}>{c.rotulo}</span>
        </label>
      ))}
    </div>
  )

  const filtroFabricante = (
    <Select value={fabricanteFiltro || "Todos"} onValueChange={(v) => comReset(setFabricanteFiltro)(!v || v === "Todos" ? "" : String(v))}>
      <SelectTrigger aria-label="Fabricante" className={`${CONTROLE} w-full px-3 cursor-pointer`}>
        <span className="truncate">{fabricanteFiltro || "Todos os fabricantes"}</span>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <SelectItem value="Todos">Todos os fabricantes</SelectItem>
        {fabricantesUnicos.map((fab) => <SelectItem key={fab} value={fab}>{fab}</SelectItem>)}
      </SelectContent>
    </Select>
  )

  const filtroDistancia = (
    <Select value={distanciaMax} onValueChange={(v) => comReset(setDistanciaMax)(String(v || "Todas"))}>
      <SelectTrigger aria-label="Distância máxima" className={`${CONTROLE} w-full px-3 cursor-pointer`}>
        <span className="truncate">{DISTANCIAS.find((d) => d.valor === distanciaMax)?.rotulo}</span>
      </SelectTrigger>
      <SelectContent>
        {DISTANCIAS.map((d) => <SelectItem key={d.valor} value={d.valor}>{d.rotulo}</SelectItem>)}
      </SelectContent>
    </Select>
  )

  const filtroPreco = (
    <div className="flex items-center gap-1.5" role="group" aria-label="Faixa de preço do lote">
      {[["Mín", precoMin, setPrecoMin], ["Máx", precoMax, setPrecoMax]].map(([rotulo, valor, setter]) => (
        <div key={rotulo as string} className="relative flex-1 min-w-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">R$</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder={rotulo as string}
            aria-label={`Preço ${(rotulo as string).toLowerCase()}`}
            value={valor as string}
            onChange={(e) => comReset(setter as (v: string) => void)(e.target.value)}
            className={`${CONTROLE} w-full pl-8 pr-2 tabular-nums outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </div>
      ))}
    </div>
  )

  const filtroOrdenacao = (
    <Select value={ordenacao} onValueChange={(v) => setOrdenacao(String(v || "Recentes"))}>
      <SelectTrigger aria-label="Ordenar por" className={`${CONTROLE} w-full sm:w-48 px-3 cursor-pointer`}>
        <span className="truncate"><span className="text-slate-500">Ordenar:</span> {ordenacao}</span>
      </SelectTrigger>
      <SelectContent>
        {ORDENACOES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  )

  return (
    <div className="w-full text-slate-800">
      <header className="mb-5">
        <h1 className="sr-only">Catálogo</h1>
        <p className="text-sm text-slate-500">
          Materiais e medicamentos anunciados por outras instituições credenciadas.
        </p>
      </header>

      {/* ─── Barra de busca com filtros recolhíveis ─── */}
      <div>
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 p-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Buscar por insumo, fabricante, vendedor ou nº do anúncio"
                aria-label="Buscar no catálogo"
                className={`${CONTROLE} w-full pl-9 pr-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-400`}
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltrosAbertos((v) => !v)}
              aria-expanded={filtrosAbertos}
              aria-controls="painel-filtros"
              className={`h-9 shrink-0 inline-flex items-center gap-2 px-3 rounded-lg border text-sm font-medium transition-colors
                ${filtrosAbertos ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Filtros</span>
              {chips.length > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-700 text-white text-[11px] font-semibold inline-flex items-center justify-center tabular-nums">
                  {chips.length}
                </span>
              )}
              <ChevronDown size={14} className={`hidden sm:block transition-transform ${filtrosAbertos ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <div className="hidden sm:block w-48 shrink-0">{filtroOrdenacao}</div>
          </div>

          {/* Painel recolhível */}
          <div
            id="painel-filtros"
            className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${filtrosAbertos ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            inert={!filtrosAbertos}
          >
            <div className="overflow-hidden">
              <div className="border-t border-slate-100 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-x-5 gap-y-3">
                  <div className="sm:col-span-2 xl:col-span-1">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Categoria</p>
                    {filtroCategoria}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Fabricante</p>
                    {filtroFabricante}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Distância da sua instituição</p>
                    {filtroDistancia}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Valor do lote</p>
                    {filtroPreco}
                  </div>
                  <div className="sm:hidden">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Ordenação</p>
                    {filtroOrdenacao}
                  </div>
                </div>
                {chips.length > 0 && (
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={handleClearFilters} className="text-sm font-semibold text-blue-700 hover:underline">
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Resultado e filtros ativos ─── */}
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-2 min-h-8">
        <p className="text-sm text-slate-600 mr-1">
          <span className="font-semibold text-slate-900 tabular-nums">{filteredAnuncios.length}</span>{" "}
          {filteredAnuncios.length === 1 ? "anúncio" : "anúncios"}
        </p>
        {chips.map((c) => (
          <button
            key={c.rotulo}
            type="button"
            onClick={() => { c.limpar(); setCurrentPage(1) }}
            className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            aria-label={`Remover filtro ${c.rotulo}`}
          >
            {c.rotulo}
            <X size={12} className="text-slate-400" aria-hidden="true" />
          </button>
        ))}
        {chips.length > 1 && (
          <button type="button" onClick={handleClearFilters} className="text-xs font-semibold text-blue-700 hover:underline ml-1">
            Limpar filtros
          </button>
        )}
      </div>

      {/* ─── Grade de anúncios ─── */}
      {paginatedAnuncios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paginatedAnuncios.map((anuncio) => {
            const mat = materiaisMap.get(anuncio.cd_mat)
            const nome = mat?.ds_mat || anuncio.material_nome || "Insumo sem nome"
            const valor = Number(anuncio.val_base || 0)
            const validade = formatarData(anuncio.dt_validade)
            const dias = diasAte(anuncio.dt_validade)
            const vencendo = dias !== null && dias >= 0 && dias <= 30
            const distancia = distanciaDe(anuncio)
            const local = [anuncio.anunciante_cidade, anuncio.anunciante_estado].filter(Boolean).join("/")
            const abrir = () => {
              if (mat?.ds_mat) triggerProfileUpdate(mat.ds_mat)
              router.push(`/anunciar/${anuncio.nr_anuncio}`)
            }

            return (
              <article
                key={anuncio.nr_anuncio}
                className="group relative flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.18)] transition-[box-shadow,border-color]"
              >
                <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                  {anuncio.imagem_anuncio ? (
                    <img src={anuncio.imagem_anuncio} alt="" loading="lazy" className="w-full h-full object-contain p-2 bg-white group-hover:scale-[1.02] transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <PackageX className="w-8 h-8 stroke-[1.5]" aria-hidden="true" />
                      <span className="mt-1 text-xs">Sem foto</span>
                    </div>
                  )}
                  {anuncio.is_recommended && (
                    <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 h-6 px-2 rounded-md bg-white/95 text-[11px] font-semibold text-slate-700 shadow-sm">
                      <Sparkles size={12} className="text-blue-700" aria-hidden="true" /> Recomendado
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col p-4">
                  <h2 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2" title={nome}>
                    {/* Link cobre o cartão inteiro, mantendo o mapa clicável por cima */}
                    <button type="button" onClick={abrir} className="text-left after:absolute after:inset-0 focus-visible:outline-none group-hover:text-blue-700 transition-colors">
                      {nome}
                    </button>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 truncate">
                    {[mat?.ds_marca, mat?.ds_tipo].filter(Boolean).join(" · ") || "Fabricante não informado"}
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-slate-500">Validade</dt>
                    <dd className={`text-right tabular-nums font-medium ${vencendo ? "text-amber-700" : "text-slate-800"}`}>
                      {validade ?? "—"}
                    </dd>
                    <dt className="text-slate-500">Quantidade</dt>
                    <dd className="text-right tabular-nums font-medium text-slate-800">{quantidadeComUnidade(anuncio.qtd_mat, mat?.unidade_med)}</dd>
                    <dt className="text-slate-500">Lote</dt>
                    <dd className="text-right tabular-nums font-medium text-slate-800 truncate">{anuncio.ds_lote || "—"}</dd>
                  </dl>

                  <div className="mt-auto pt-3">
                    <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate" title={anuncio.anunciante_razao}>
                          {anuncio.anunciante_razao || "Vendedor"}
                        </p>
                        <button
                          type="button"
                          disabled={!anuncio.anunciante_lat || !anuncio.anunciante_lon}
                          onClick={() => setSelectedMapAnuncio(anuncio)}
                          className="relative z-10 mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 enabled:hover:text-blue-700 disabled:cursor-default max-w-full"
                          title={anuncio.anunciante_lat ? "Ver no mapa" : undefined}
                        >
                          <MapPin size={12} className="shrink-0" aria-hidden="true" />
                          <span className="truncate tabular-nums">
                            {local || "Local não informado"}
                            {distancia !== null && ` · ${distancia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`}
                          </span>
                        </button>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-slate-500">Valor do lote</p>
                        <p className="text-base font-bold text-slate-900 tabular-nums">{brl(valor)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-xl border border-slate-200">
          <PackageX className="w-9 h-9 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">Nenhum anúncio encontrado</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-sm">
            {chips.length > 0 || search ? "Ajuste a busca ou remova filtros para ver mais resultados." : "Ainda não há anúncios de outras instituições."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {search.trim().length >= 2 && (
              <button
                type="button"
                onClick={criarAlertaDaBusca}
                className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white"
              >
                <BellRing size={15} aria-hidden="true" /> Me avise quando aparecer &quot;{search.trim()}&quot;
              </button>
            )}
            {chips.length > 0 && (
              <button type="button" onClick={handleClearFilters} className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

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

      {/* ─── Mapa ─── */}
      <Dialog open={!!selectedMapAnuncio} onOpenChange={(open) => !open && setSelectedMapAnuncio(null)}>
        <DialogContent className="sm:max-w-lg p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {selectedMapAnuncio?.anunciante_razao || "Localização do vendedor"}
          </DialogTitle>
          {selectedMapAnuncio?.anunciante_lat && selectedMapAnuncio?.anunciante_lon && (
            <>
              <p className="mt-1 text-sm text-slate-600">
                {[
                  [selectedMapAnuncio.anunciante_logradouro, selectedMapAnuncio.anunciante_numero].filter(Boolean).join(", "),
                  selectedMapAnuncio.anunciante_bairro,
                  [selectedMapAnuncio.anunciante_cidade, selectedMapAnuncio.anunciante_estado].filter(Boolean).join("/"),
                ].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-4 w-full h-64 rounded-lg overflow-hidden border border-slate-200">
                <iframe
                  title="Mapa da localização do vendedor"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${selectedMapAnuncio.anunciante_lat},${selectedMapAnuncio.anunciante_lon}&hl=pt-BR&z=15&output=embed`}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
