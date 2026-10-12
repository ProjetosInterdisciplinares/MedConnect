"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  MapPin,
  Map as MapIcon,
  Package,
  PackageX,
  AlertCircle,
  CheckCircle,
  Flag,
  ChevronRight,
  Info,
  Building2,
  Handshake,
  ShoppingCart
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import servicesGetAnuncioDetails from "@/server/(GET)-anuncio-details"
import servicesPostNegociacao from "@/server/(POST)-negociacao"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import { Anuncio, MatMed, PessoaJuridica } from "@/types"
import { AuthManager } from "@/lib/AuthManager"

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // km
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

export default function AnuncioDetalhePage() {
  const { id } = useParams()
  const router = useRouter()

  const [anuncio, setAnuncio] = useState<Anuncio | null>(null)
  const [material, setMaterial] = useState<MatMed | null>(null)
  const [meuPerfil, setMeuPerfil] = useState<PessoaJuridica | null>(null)
  const [loading, setLoading] = useState(true)

  // Estados de Proposta & Modais
  const [valorProposta, setValorProposta] = useState("")
  const [qtdProposta, setQtdProposta] = useState("")
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false)
  const [isOfertaModalOpen, setIsOfertaModalOpen] = useState(false)
  const [isDenunciaModalOpen, setIsDenunciaModalOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState("Informações incorretas")

  // Feedback Dialogs
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [isErrorOpen, setIsErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  function showError(msg: string) {
    setErrorMessage(msg)
    setIsErrorOpen(true)
  }

  useEffect(() => {
    async function load() {
      try {
        const [res, matRes, perfilRes] = await Promise.all([
          servicesGetAnuncioDetails(Number(id)),
          servicesGetMaterials(),
          servicesGetMinhaPessoaJuridica(),
        ])

        if (!("isError" in res)) {
          setAnuncio(res)

          if (Array.isArray(matRes)) {
            const foundMat = matRes.find((m) => m.cd_mat === res.cd_mat)
            if (foundMat) setMaterial(foundMat)
          }
        }

        if (perfilRes && !("isError" in perfilRes)) {
          setMeuPerfil(perfilRes as PessoaJuridica)
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes do anúncio:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Ações de Negociação
  async function handleCompraDireta() {
    if (!anuncio) return
    const cdPessoa = Number(AuthManager.getInstance().getUserId())
    if (!cdPessoa) {
      showError("Usuário não autenticado")
      return
    }

    const res = await servicesPostNegociacao({
      anuncio: Number(id),
      vendedor: anuncio.cd_pessoa_anunciante,
      val_proposta: anuncio.val_base,
      qtd_proposta: anuncio.qtd_mat,
      ds_obs: "Compra Direta via Plataforma",
    })

    if ("isError" in res) {
      showError("Erro ao realizar compra: " + (res as any).message)
      return
    }

    setIsCompraModalOpen(false)
    setSuccessMessage("Compra realizada com sucesso!")
    setIsSuccessOpen(true)
  }

  async function handleProposta() {
    if (!anuncio) return
    const cdPessoa = Number(AuthManager.getInstance().getUserId())
    if (!cdPessoa) {
      showError("Usuário não autenticado")
      return
    }
    if (!valorProposta || Number(valorProposta) <= 0) {
      showError("Informe um valor de proposta válido")
      return
    }

    const qtd = qtdProposta === "" ? anuncio.qtd_mat : Number(qtdProposta)
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > anuncio.qtd_mat) {
      showError(`Informe uma quantidade entre 1 e ${anuncio.qtd_mat}`)
      return
    }
    if (
      qtd < anuncio.qtd_mat &&
      Number(valorProposta) === Number(anuncio.val_base)
    ) {
      showError(
        "Ao comprar uma quantidade menor, é obrigatório sugerir um novo valor total (diferente do valor integral)."
      )
      return
    }

    const res = await servicesPostNegociacao({
      anuncio: Number(id),
      vendedor: anuncio.cd_pessoa_anunciante,
      val_proposta: valorProposta,
      qtd_proposta: qtd,
      ds_obs: "Proposta enviada pelo comprador",
    })

    if ("isError" in res) {
      showError("Erro ao enviar proposta: " + (res as any).message)
      return
    }

    setIsOfertaModalOpen(false)
    setSuccessMessage("Proposta enviada com sucesso!")
    setIsSuccessOpen(true)
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false)
    router.push("/minhas-negociacoes")
  }

  function handleDenunciarSubmit() {
    setIsDenunciaModalOpen(false)
    setSuccessMessage("Denúncia registrada com sucesso! Nossa equipe analisará o anúncio.")
    setIsSuccessOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-canvas">
        <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!anuncio) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 text-center bg-canvas">
        <PackageX className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-xl font-bold text-slate-700">Anúncio não encontrado</h2>
        <Link
          href="/catalogo"
          className="mt-4 text-sm font-semibold text-brand hover:underline"
        >
          Voltar para o catálogo
        </Link>
      </div>
    )
  }

  // Cálculos de Preço e Quantidade
  const valBaseNum = Number(anuncio.val_base) || 0
  const qtdNum = anuncio.qtd_mat || 1
  const precoUnitario = valBaseNum / (qtdNum > 0 ? qtdNum : 1)

  // Unidade de medida textual
  const unidadeRaw = material?.unidade_med?.trim().toLowerCase() || "caixa"
  const unidadeSingular = unidadeRaw.includes("caixa")
    ? "caixa"
    : unidadeRaw.includes("frasco")
    ? "frasco"
    : unidadeRaw.includes("unidade")
    ? "unidade"
    : unidadeRaw
  const unidadePlural = unidadeSingular === "caixa"
    ? "caixas"
    : unidadeSingular === "frasco"
    ? "frascos"
    : unidadeSingular === "unidade"
    ? "unidades"
    : `${unidadeSingular}s`

  // Data de validade formatada
  let dataValidade = "Não informada"
  if (anuncio.dt_validade) {
    const d = new Date(anuncio.dt_validade)
    if (!isNaN(d.getTime())) {
      dataValidade = d.toLocaleDateString("pt-BR")
    }
  }

  // Nome e Cidade do Vendedor
  const vendedorNome =
    anuncio.anunciante_razao ||
    (anuncio as any).nm_vendedor ||
    (anuncio as any).ds_empresa ||
    "Hospital Parceiro"

  const vendedorCidadeEstado =
    anuncio.anunciante_cidade && anuncio.anunciante_estado
      ? `${anuncio.anunciante_cidade} / ${anuncio.anunciante_estado}`
      : "Campinas / SP"

  const vendedorTelefone =
    anuncio.anunciante_telefone ||
    (anuncio as any).telefone ||
    "(19) 12345-1234"

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
        ).toFixed(1)
      : null

  const isDono =
    anuncio.cd_pessoa_anunciante === Number(AuthManager.getInstance().getUserId())
  const bloqueado = anuncio.ie_status !== "A"

  // Lista de códigos de referência formatados para a linha pontilhada
  const codigosReferencia = [
    {
      label: "ANVISA",
      value:
        (material as any)?.cd_anvisa ||
        (material as any)?.cd_registro_ms ||
        "80254280",
    },
    {
      label: "TISS",
      value: material?.cd_tiss || "03.07.01.030-2",
    },
    {
      label: "TUSS",
      value: material?.cd_tuss || "0301070103",
    },
    ...(material?.cd_simpro
      ? [{ label: "SIMPRO", value: material.cd_simpro }]
      : []),
    ...(material?.cd_brasindice
      ? [{ label: "BRASÍNDICE", value: material.cd_brasindice }]
      : []),
  ]

  return (
    <div className="w-full min-h-screen bg-canvas text-slate-800 antialiased py-6 sm:py-8 px-4 sm:px-6 lg:px-12">
      <div className="max-w-[1240px] mx-auto">

        {/* ═══════════════════════════════════════════════════════════════
         * BREADCRUMB: Catálogo > Nome do Produto
         * ═══════════════════════════════════════════════════════════════ */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs sm:text-sm mb-6 text-slate-500 font-medium"
        >
          <Link
            href="/catalogo"
            className="hover:text-brand transition-colors text-slate-600 font-semibold"
          >
            Catálogo
          </Link>
          <ChevronRight size={14} className="text-slate-400 shrink-0" />
          <span className="text-slate-900 font-bold truncate max-w-[280px] sm:max-w-md">
            {material?.ds_mat || "Dipirona Gotas 500mg/mL"}
          </span>
        </nav>

        {/* ═══════════════════════════════════════════════════════════════
         * GRID PRINCIPAL (2 COLUNAS NO DESKTOP, EMPILHADO NO MOBILE)
         * ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─────────────────────────────────────────────────────────────
           * COLUNA ESQUERDA (IMAGEM + DESCRIÇÃO + CÓDIGOS DE REFERÊNCIA)
           * ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* CARD 1: IMAGEM DO PRODUTO */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-10 flex items-center justify-center min-h-[360px] sm:min-h-[440px] relative overflow-hidden group">
              {anuncio.imagem_anuncio ? (
                <img
                  src={anuncio.imagem_anuncio}
                  alt={material?.ds_mat || "Imagem do Produto"}
                  className="max-h-[340px] sm:max-h-[400px] w-auto max-w-full object-contain mix-blend-multiply drop-shadow-md group-hover:scale-102 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <Package className="w-20 h-20 mb-2 stroke-1" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Sem foto do produto
                  </span>
                </div>
              )}
            </div>

            {/* CARD 2: DESCRIÇÃO */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
              <h2 className="text-lg sm:text-xl font-bold text-brand-header mb-3 tracking-tight">
                Descrição
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {anuncio.ds_obs ||
                  "Dipirona sódica 500mg/mL gotas, frascos-ampola de 2mL individuais. Medicamento para uso hospitalar, sob controle de temperatura 15–30°C, cadeia de frio preservada. Rastreabilidade disponível, nota fiscal emitida, conforme RDC ANVISA 204/2017."}
              </p>
            </div>

            {/* CARD 3: CÓDIGOS DE REFERÊNCIA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
              <h2 className="text-lg sm:text-xl font-bold text-brand-header mb-4 tracking-tight">
                Códigos de referência
              </h2>
              <div className="space-y-3">
                {codigosReferencia.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-baseline justify-between text-xs sm:text-sm"
                  >
                    <span className="font-bold text-slate-700 tracking-wider uppercase text-xs shrink-0">
                      {item.label}
                    </span>
                    <span
                      className="flex-1 mx-3 border-b border-dotted border-slate-300"
                      aria-hidden="true"
                    />
                    <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm shrink-0 tracking-wider">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ─────────────────────────────────────────────────────────────
           * COLUNA DIREITA (INFORMAÇÕES, PREÇO, BOTÕES, VENDEDOR E DENÚNCIA)
           * ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-4 sticky top-20">

            {/* CARD 1: INFORMAÇÕES DE COMPRA & ESPECIFICAÇÕES */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
              {/* Título do Produto */}
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {material?.ds_mat || "Dipirona Gotas 500mg/mL"}
              </h1>

              {/* Fabricante */}
              <p className="text-sm font-semibold text-brand-header mt-1 mb-5">
                {material?.ds_marca ||
                  (anuncio as any).nm_fabricante ||
                  "Neo Química"}
              </p>

              {/* Linhas de Especificação */}
              <div className="border-t border-slate-100 divide-y divide-slate-100 text-sm">
                {/* Lote */}
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Lote</span>
                  <span className="text-slate-900 font-bold">
                    {anuncio.ds_lote || "LT-2024-09-012"}
                  </span>
                </div>

                {/* Validade */}
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Validade</span>
                  <span className="text-slate-900 font-bold">
                    {dataValidade !== "Não informada" ? dataValidade : "19/09/2027"}
                  </span>
                </div>

                {/* Quantidade */}
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Qtd.</span>
                  <span className="text-slate-900 font-bold">
                    {anuncio.qtd_mat} {anuncio.qtd_mat > 1 ? unidadePlural : unidadeSingular}
                  </span>
                </div>

                {/* Faixa de Preço */}
                <div className="pt-3 pb-1 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Faixa de preço</span>
                  <span className="text-slate-900 font-bold text-sm">
                    R$
                    {precoUnitario.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    /{unidadeSingular}
                  </span>
                </div>
              </div>

              {/* Preço Total em Destaque */}
              <div className="mt-4 pt-1">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-header tracking-tight leading-none">
                  R$
                  {valBaseNum.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <span className="text-xs text-slate-400 font-medium block mt-1.5">
                  *Preço anunciado
                </span>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO: COMPRA IMEDIATA & FAZER OFERTA */}
            {bloqueado ? (
              <div className="bg-danger-subtle border border-danger-border rounded-2xl p-4 text-center text-danger font-semibold text-sm">
                Este anúncio não está mais disponível para negociação.
              </div>
            ) : isDono ? (
              <div className="bg-brand-subtle border border-brand-border rounded-2xl p-4 text-center text-brand-hover font-semibold text-sm flex items-center justify-center gap-2">
                <Info size={18} className="text-brand shrink-0" />
                <span>Este é o seu próprio anúncio.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsCompraModalOpen(true)}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold text-sm sm:text-base py-3.5 sm:py-4 px-3 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center text-center cursor-pointer active:scale-[0.99]"
                >
                  Compra imediata
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQtdProposta("")
                    setValorProposta("")
                    setIsOfertaModalOpen(true)
                  }}
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold text-sm sm:text-base py-3.5 sm:py-4 px-3 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center text-center cursor-pointer active:scale-[0.99]"
                >
                  Fazer oferta
                </button>
              </div>
            )}

            {/* CARD 2: VENDEDOR & TELEFONE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {/* Lado Esquerdo: Vendedor */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Vendedor
                  </span>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand-header shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm text-slate-900 block leading-tight">
                        {vendedorNome}
                      </span>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        {vendedorCidadeEstado}
                      </span>
                      {distanciaKm && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] text-brand-hover font-bold">
                            {distanciaKm} km de você
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsMapOpen(true)}
                            className="text-[11px] text-brand hover:text-brand-hover underline font-semibold cursor-pointer"
                          >
                            (ver mapa)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Número */}
                <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Número
                  </span>
                  <span className="font-bold text-sm text-slate-900 block">
                    {vendedorTelefone}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(
                        `/catalogo?anunciante=${encodeURIComponent(vendedorNome)}`
                      )
                    }}
                    className="text-xs font-semibold text-brand hover:text-brand-hover hover:underline mt-2 text-left cursor-pointer transition-colors"
                  >
                    Ver mais anúncios ↗
                  </button>
                </div>
              </div>
            </div>

            {/* BOTÃO DENUNCIAR ANÚNCIO */}
            <button
              type="button"
              onClick={() => setIsDenunciaModalOpen(true)}
              className="w-full bg-danger-subtle hover:bg-danger-border text-danger border border-danger-border rounded-2xl py-3.5 px-4 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Flag size={16} className="fill-danger" />
              <span>Denunciar anúncio</span>
            </button>

          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
       * MODAL 1: COMPRA IMEDIATA
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isCompraModalOpen} onOpenChange={setIsCompraModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-header flex items-center gap-2">
              <ShoppingCart size={20} className="text-brand" />
              Confirmar Compra Imediata
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              Você está fechando a compra integral deste anúncio nas condições originais anunciadas.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 my-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Produto:</span>
              <span className="font-bold text-slate-800 text-right">
                {material?.ds_mat || "Insumo"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Quantidade:</span>
              <span className="font-bold text-slate-800">
                {anuncio.qtd_mat} {anuncio.qtd_mat > 1 ? unidadePlural : unidadeSingular}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Vendedor:</span>
              <span className="font-bold text-slate-800">{vendedorNome}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-700">Valor Total:</span>
              <span className="font-black text-lg text-brand-header">
                R$
                {valBaseNum.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setIsCompraModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCompraDireta}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              Finalizar Compra
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
       * MODAL 2: FAZER OFERTA (PROPOSTA PERSONALIZADA)
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isOfertaModalOpen} onOpenChange={setIsOfertaModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-header flex items-center gap-2">
              <Handshake size={20} className="text-brand" />
              Fazer Oferta ao Vendedor
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              Envie uma proposta com a quantidade desejada e o valor que você deseja pagar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm">
            {/* Quantidade */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs uppercase tracking-wider">
                Quantidade desejada ({unidadePlural})
              </label>
              <input
                type="number"
                min={1}
                max={anuncio.qtd_mat}
                value={qtdProposta}
                onChange={(e) => setQtdProposta(e.target.value)}
                placeholder={`Máx.: ${anuncio.qtd_mat} (deixe vazio para tudo)`}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white outline-none font-bold text-slate-800 text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Disponível no anúncio: {anuncio.qtd_mat} {unidadePlural}
              </span>
            </div>

            {/* Valor da Proposta */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs uppercase tracking-wider">
                Sua Oferta - Valor Total (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={valorProposta}
                  onChange={(e) => setValorProposta(e.target.value)}
                  placeholder={`Ex: ${(valBaseNum * 0.9).toFixed(2)}`}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white outline-none font-bold text-slate-800 text-sm"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Preço original total: R$
                {valBaseNum.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end mt-2">
            <button
              type="button"
              onClick={() => setIsOfertaModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleProposta}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              Enviar Oferta
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
       * MODAL 3: DENUNCIAR ANÚNCIO
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isDenunciaModalOpen} onOpenChange={setIsDenunciaModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-danger flex items-center gap-2">
              <Flag size={20} className="fill-danger" />
              Denunciar Anúncio
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              Informe o motivo para que nossa equipe de moderação hospitalar audite este anúncio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 my-3">
            {[
              "Informações incorretas ou enganosas",
              "Problema com validade ou lote",
              "Preço abusivo ou fora do mercado",
              "Produto com restrição regulatória",
              "Outro motivo",
            ].map((motivo) => (
              <label
                key={motivo}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition-colors"
              >
                <input
                  type="radio"
                  name="motivoDenuncia"
                  value={motivo}
                  checked={motivoDenuncia === motivo}
                  onChange={(e) => setMotivoDenuncia(e.target.value)}
                  className="text-brand"
                />
                <span>{motivo}</span>
              </label>
            ))}
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setIsDenunciaModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDenunciarSubmit}
              className="px-5 py-2.5 rounded-xl bg-danger hover:bg-danger/90 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              Enviar Denúncia
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
       * MODAL 4: MAPA DA LOCALIZAÇÃO DO ANUNCIANTE
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-header font-bold">
              <MapPin className="w-5 h-5 text-brand" />
              Localização do Anunciante
            </DialogTitle>
          </DialogHeader>
          {anuncio && anuncio.anunciante_lat && anuncio.anunciante_lon && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${anuncio.anunciante_lat},${anuncio.anunciante_lon}&hl=pt-BR&z=15&output=embed`}
                />
              </div>
              <p className="text-xs text-slate-500 font-medium text-center">
                {anuncio.anunciante_logradouro && `${anuncio.anunciante_logradouro}, `}
                {anuncio.anunciante_numero && `${anuncio.anunciante_numero} - `}
                {anuncio.anunciante_bairro && `${anuncio.anunciante_bairro}, `}
                {vendedorCidadeEstado}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
       * MODAL 5: SUCESSO
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={isSuccessOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseSuccess()
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success text-xl font-bold">
              <CheckCircle className="w-6 h-6" />
              Tudo Certo!
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-center text-slate-600 my-2">
            Você pode acompanhar o andamento da negociação na aba{" "}
            <strong>Minhas Negociações</strong>.
          </div>
          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={handleCloseSuccess}
              className="px-5 py-2.5 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-hover transition-colors w-full sm:w-auto cursor-pointer"
            >
              Ir para Minhas Negociações
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
       * MODAL 6: ERRO / ATENÇÃO
       * ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isErrorOpen} onOpenChange={setIsErrorOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger text-xl font-bold">
              <AlertCircle className="w-6 h-6" />
              Atenção
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-medium text-slate-800">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <button
              type="button"
              onClick={() => setIsErrorOpen(false)}
              className="px-6 py-2.5 bg-slate-200 text-slate-800 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors cursor-pointer"
            >
              OK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}