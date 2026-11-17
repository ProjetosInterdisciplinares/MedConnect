"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { MapPin, Package, PackageX, Flag, ChevronRight, MessageCircle, Store, CalendarClock } from "lucide-react"
import InfoCodigo from "@/components/ui/info-codigo"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import servicesGetAnuncioDetails from "@/server/(GET)-anuncio-details"
import servicesPostNegociacao from "@/server/(POST)-negociacao"
import servicesGetMaterials from "@/server/(GET)-materials-and-brands"
import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import servicesPostPrecoReferencia from "@/server/(POST)-preco-referencia"
import { Anuncio, MatMed, PessoaJuridica, PrecoReferencia } from "@/types"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"
import { AuthManager } from "@/lib/AuthManager"
import { quantidadeComUnidade, unidadeDeVenda } from "@/lib/format/unidade"

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
// Preços unitários de compras públicas podem ter 4 casas (R$ 0,0450)
const brlUnitario = (v: string | undefined) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 })

function formatarData(iso: string | null | undefined) {
  if (!iso) return null
  const [a, m, d] = iso.slice(0, 10).split("-")
  return a && m && d ? `${d}/${m}/${a}` : null
}

function diasAte(iso: string | null | undefined) {
  if (!iso) return null
  const alvo = new Date(iso.slice(0, 10) + "T00:00:00")
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

/* Classes compartilhadas */
const CARTAO = "bg-white rounded-xl border border-slate-200"
const BTN_PRIMARIO = "h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors cursor-pointer"
const BTN_SECUNDARIO = "h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
const INPUT = "w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 tabular-nums outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 tabular-nums">{children}</dd>
    </div>
  )
}

export default function AnuncioDetalhePage() {
  const { id } = useParams()
  const router = useRouter()

  const [anuncio, setAnuncio] = useState<Anuncio | null>(null)
  const [material, setMaterial] = useState<MatMed | null>(null)
  const [meuPerfil, setMeuPerfil] = useState<PessoaJuridica | null>(null)
  const [loading, setLoading] = useState(true)

  // Propostas e modais
  const [valorProposta, setValorProposta] = useState("")
  const [qtdProposta, setQtdProposta] = useState("")
  // false enquanto o valor é a sugestão proporcional; vira true quando o comprador digita
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false)
  const [isOfertaModalOpen, setIsOfertaModalOpen] = useState(false)
  const [isDenunciaModalOpen, setIsDenunciaModalOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState("Informações incorretas ou enganosas")

  // Retorno ao usuário
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successTitle, setSuccessTitle] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [successIrParaNegociacoes, setSuccessIrParaNegociacoes] = useState(true)
  const [isErrorOpen, setIsErrorOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Preço de referência (Compras.gov.br)
  const { precoReferencia: custoPreco } = useCustosCreditos()
  const [preco, setPreco] = useState<PrecoReferencia | null>(null)
  const [consultandoPreco, setConsultandoPreco] = useState(false)

  function showError(msg: string) {
    setErrorMessage(msg)
    setIsErrorOpen(true)
  }

  function showSuccess(titulo: string, msg: string, irParaNegociacoes = true) {
    setSuccessTitle(titulo)
    setSuccessMessage(msg)
    setSuccessIrParaNegociacoes(irParaNegociacoes)
    setIsSuccessOpen(true)
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
        if (perfilRes && !("isError" in perfilRes)) setMeuPerfil(perfilRes as PessoaJuridica)
      } catch (err) {
        console.error("Erro ao carregar detalhes do anúncio:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleCompraDireta() {
    if (!anuncio) return
    if (!Number(AuthManager.getInstance().getUserId())) {
      showError("Sua sessão expirou. Entre novamente para continuar.")
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
      showError("Não foi possível registrar a compra: " + (res as any).message)
      return
    }
    setIsCompraModalOpen(false)
    showSuccess("Pedido de compra enviado", "O vendedor foi notificado e precisa confirmar a venda.")
  }

  async function handleProposta() {
    if (!anuncio) return
    if (!Number(AuthManager.getInstance().getUserId())) {
      showError("Sua sessão expirou. Entre novamente para continuar.")
      return
    }
    if (!valorProposta || Number(valorProposta) <= 0) {
      showError("Informe o valor total que você propõe pagar.")
      return
    }
    const qtd = qtdProposta === "" || anuncio.ie_aceita_parcial === false ? anuncio.qtd_mat : Number(qtdProposta)
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > anuncio.qtd_mat) {
      showError(`Informe uma quantidade entre 1 e ${anuncio.qtd_mat}.`)
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
      showError("Não foi possível enviar a proposta: " + (res as any).message)
      return
    }
    setIsOfertaModalOpen(false)
    showSuccess("Proposta enviada", "O vendedor pode aceitar ou recusar a sua oferta.")
  }

  async function handleConsultarPreco() {
    if (!material) return
    setConsultandoPreco(true)
    const res = await servicesPostPrecoReferencia(material.cd_mat)
    setConsultandoPreco(false)
    if ("isError" in res) {
      showError(res.message)
      return
    }
    setPreco(res)
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false)
    if (successIrParaNegociacoes) router.push("/minhas-negociacoes")
  }

  function handleDenunciarSubmit() {
    setIsDenunciaModalOpen(false)
    showSuccess("Denúncia registrada", "A equipe do MedConnect vai analisar este anúncio.", false)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-7 h-7 border-[3px] border-blue-700 border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
      </div>
    )
  }

  if (!anuncio) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <PackageX className="w-10 h-10 text-slate-300 mb-3" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">Anúncio não encontrado</h2>
        <Link href="/catalogo" className="mt-3 text-sm font-semibold text-blue-700 hover:underline">
          Voltar para o catálogo
        </Link>
      </div>
    )
  }

  /* ─── Valores ─── */
  const valorLote = Number(anuncio.val_base) || 0
  const qtd = anuncio.qtd_mat || 0
  const precoUnitario = qtd > 0 ? valorLote / qtd : valorLote


  // Unidade de venda: "Caixa c/ 100" → "caixa"
  const unidadeTexto = material?.unidade_med?.trim() || ""
  const { singular: unidadeBase, plural } = unidadeDeVenda(unidadeTexto)
  const qtdTexto = quantidadeComUnidade(qtd, unidadeTexto)
  const aceitaParcial = anuncio.ie_aceita_parcial !== false

  const nomeProduto = material?.ds_mat || anuncio.material_nome || "Insumo sem nome"
  const validade = formatarData(anuncio.dt_validade)
  const fabricacao = formatarData(anuncio.dt_fabricacao)
  const dias = diasAte(anuncio.dt_validade)
  const vencendo = dias !== null && dias >= 0 && dias <= 30

  const vendedorNome = anuncio.anunciante_razao || "Vendedor não identificado"
  const vendedorLocal = anuncio.anunciante_cidade && anuncio.anunciante_estado
    ? `${anuncio.anunciante_cidade}/${anuncio.anunciante_estado}`
    : null
  const enderecoCompleto = [
    [anuncio.anunciante_logradouro, anuncio.anunciante_numero].filter(Boolean).join(", "),
    anuncio.anunciante_bairro,
    vendedorLocal,
  ].filter(Boolean).join(" · ")

  const distanciaKm =
    meuPerfil?.latitude && meuPerfil?.longitude && anuncio.anunciante_lat && anuncio.anunciante_lon
      ? getDistance(Number(meuPerfil.latitude), Number(meuPerfil.longitude), Number(anuncio.anunciante_lat), Number(anuncio.anunciante_lon))
      : null

  const isDono = anuncio.cd_pessoa_anunciante === Number(AuthManager.getInstance().getUserId())
  const bloqueado = anuncio.ie_status !== "A"

  const codigos = [
    { rotulo: "TUSS", codigo: "TUSS" as const, valor: material?.cd_tuss },
    { rotulo: "SIMPRO", codigo: "SIMPRO" as const, valor: material?.cd_simpro },
    { rotulo: "Brasíndice", codigo: "BRASINDICE" as const, valor: material?.cd_brasindice },
    { rotulo: "CATMAT", codigo: "CATMAT" as const, valor: material?.cd_catmat },
  ]

  return (
    <div className="w-full max-w-[1200px] text-slate-800">
      {/* Navegação */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-500 mb-4 min-w-0">
        <Link href="/catalogo" className="hover:text-blue-700 transition-colors">Catálogo</Link>
        <ChevronRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className="text-slate-700 truncate">{nomeProduto}</span>
      </nav>

      {/* Cabeçalho */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-balance">{nomeProduto}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          {material?.ds_marca && <span className="font-medium text-slate-700">{material.ds_marca}</span>}
          {material?.ds_marca && material?.ds_tipo && <span aria-hidden="true">·</span>}
          {material?.ds_tipo && <span>{material.ds_tipo}</span>}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">Anúncio nº {anuncio.nr_anuncio}</span>
        </p>
      </header>

      {/* Mobile: foto → compra/vendedor → dados. Desktop: dados à esquerda, compra fixa à direita. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div className={`${CARTAO} overflow-hidden min-w-0 lg:col-start-1`}>
            {anuncio.imagem_anuncio ? (
              <img
                src={anuncio.imagem_anuncio}
                alt={`Foto do lote: ${nomeProduto}`}
                className="w-full aspect-[16/9] max-h-[380px] object-contain bg-white"
              />
            ) : (
              <div className="w-full aspect-[16/9] max-h-[380px] flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                <Package className="w-10 h-10 stroke-[1.5]" aria-hidden="true" />
                <span className="mt-2 text-sm">Anúncio sem foto</span>
              </div>
            )}
          </div>

        <div className="flex flex-col gap-6 min-w-0 lg:col-start-1">
          <section className={`${CARTAO} p-5`}>
            <h2 className="text-base font-semibold text-slate-900">Dados do lote</h2>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <Campo rotulo="Lote">{anuncio.ds_lote || "Não informado"}</Campo>
              <Campo rotulo="Fabricação">{fabricacao || "Não informada"}</Campo>
              <Campo rotulo="Validade">
                <span className={vencendo ? "text-amber-700" : undefined}>{validade || "Não informada"}</span>
                {dias !== null && dias >= 0 && (
                  <span className={`block text-xs font-normal ${vencendo ? "text-amber-700" : "text-slate-500"}`}>
                    {dias === 0 ? "vence hoje" : `vence em ${dias.toLocaleString("pt-BR")} dias`}
                  </span>
                )}
              </Campo>
              <Campo rotulo="Quantidade disponível">{qtdTexto}</Campo>
              <Campo rotulo="Unidade de venda">{unidadeTexto || "Não informada"}</Campo>
              <Campo rotulo="Categoria">{material?.ds_tipo || "Não informada"}</Campo>
              <Campo rotulo="Compra parcial">{aceitaParcial ? "Aceita" : "Somente o lote inteiro"}</Campo>
            </dl>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Descrição</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-[70ch] whitespace-pre-line">
                {anuncio.ds_obs || "O anunciante não incluiu uma descrição."}
              </p>
            </div>
          </section>

          <section className={`${CARTAO} p-5`}>
            <h2 className="text-base font-semibold text-slate-900">Códigos de referência</h2>
            <p className="mt-0.5 text-xs text-slate-500">Identificação do insumo nas tabelas de faturamento.</p>
            <dl className="mt-4 grid grid-cols-2 md:grid-cols-5 rounded-lg border border-slate-200 divide-x divide-y md:divide-y-0 divide-slate-200 overflow-hidden">
              {codigos.map((c) => (
                <div key={c.rotulo} className="px-4 py-3 min-w-0">
                  <dt className="flex items-center gap-1 text-xs text-slate-500">{c.rotulo} <InfoCodigo codigo={c.codigo} /></dt>
                  <dd className={`mt-1 text-sm tabular-nums truncate ${c.valor ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                    {c.valor || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={`${CARTAO} p-5`}>
            <h2 className="text-base font-semibold text-slate-900">Preço de referência</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Quanto órgãos públicos pagaram por este item nos últimos 12 meses, pelo código CATMAT.
            </p>

            {!preco ? (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleConsultarPreco}
                  disabled={!material?.cd_catmat || consultandoPreco}
                  className={`${BTN_SECUNDARIO} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {consultandoPreco ? "Consultando…" : `Consultar preço de referência · ${rotuloCreditos(custoPreco)}`}
                </button>
                <p className="text-xs text-slate-500">
                  {material?.cd_catmat
                    ? "Os créditos só são cobrados se a consulta trouxer resultados."
                    : "Este insumo não tem código CATMAT cadastrado."}
                </p>
              </div>
            ) : !preco.encontrado ? (
              <p className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                Nenhuma compra pública deste item nos últimos 12 meses. Nenhum crédito foi cobrado.
              </p>
            ) : (
              <div className="mt-4">
                <dl className="grid grid-cols-3 rounded-lg border border-slate-200 divide-x divide-slate-200">
                  {[["Menor", preco.menor], ["Mediana", preco.mediana], ["Maior", preco.maior]].map(([rotulo, valor]) => (
                    <div key={rotulo} className="px-4 py-3 min-w-0">
                      <dt className="text-xs text-slate-500">{rotulo}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{brlUnitario(valor)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-slate-500 tabular-nums">
                  Preço por {preco.unidade || "unidade"} · {preco.total_compras?.toLocaleString("pt-BR")} compras desde {formatarData(preco.periodo_inicio)}
                </p>

                {preco.exemplos && preco.exemplos.length > 0 && (
                  <ul className="mt-4 divide-y divide-slate-100 text-sm">
                    {preco.exemplos.map((e, i) => (
                      <li key={i} className="flex justify-between gap-4 py-2">
                        <span className="min-w-0 truncate text-slate-600">{e.orgao}{e.uf && ` (${e.uf})`} · {formatarData(e.data)}</span>
                        <span className="shrink-0 font-medium text-slate-900 tabular-nums">{brlUnitario(e.preco_unitario)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  Fonte: {preco.fonte}. {preco.aviso}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ─── Coluna lateral ─── */}
        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6 max-lg:row-start-2">
          <section className={`${CARTAO} p-5`}>
            <p className="text-sm text-slate-500">Valor do lote</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 tracking-tight tabular-nums">{brl(valorLote)}</p>
            <p className="mt-1 text-sm text-slate-500 tabular-nums">
              {brl(precoUnitario)} por {unidadeBase} · {qtdTexto}
            </p>

            {bloqueado ? (
              <p className="mt-5 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                Este anúncio está em negociação ou foi encerrado e não aceita novas propostas.
              </p>
            ) : isDono ? (
              <p className="mt-5 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                Este anúncio é seu. Acompanhe as propostas em <Link href="/caixa-de-propostas" className="font-semibold text-blue-700 hover:underline">Negociações</Link>.
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-2">
                <button type="button" onClick={() => setIsCompraModalOpen(true)} className={`${BTN_PRIMARIO} h-11 w-full`}>
                  Comprar lote
                </button>
                <button
                  type="button"
                  onClick={() => { setQtdProposta(""); setValorProposta(""); setIsOfertaModalOpen(true) }}
                  className={`${BTN_SECUNDARIO} h-11 w-full`}
                >
                  Fazer proposta
                </button>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Pagamento, nota fiscal e entrega são combinados diretamente com o vendedor.
                </p>
              </div>
            )}
          </section>

          <section className={`${CARTAO} p-5`}>
            <h2 className="text-sm font-semibold text-slate-900">Vendedor</h2>
            <p className="mt-3 text-sm font-semibold text-slate-900">{vendedorNome}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              {vendedorLocal && (
                <li className="flex items-start gap-2.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>
                    {vendedorLocal}
                    {distanciaKm !== null && (
                      <span className="text-slate-500 tabular-nums"> · {distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km de você</span>
                    )}
                    {anuncio.anunciante_lat && anuncio.anunciante_lon && (
                      <button type="button" onClick={() => setIsMapOpen(true)} className="block text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
                        Ver no mapa
                      </button>
                    )}
                  </span>
                </li>
              )}
              {!isDono && (
                <li className="flex items-start gap-2.5 text-slate-500">
                  <MessageCircle size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>O WhatsApp do vendedor é liberado quando ele aceitar a sua proposta.</span>
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => router.push(`/catalogo?anunciante=${encodeURIComponent(vendedorNome)}`)}
              className={`${BTN_SECUNDARIO} mt-4 w-full inline-flex items-center justify-center gap-2`}
            >
              <Store size={16} aria-hidden="true" /> Ver outros anúncios
            </button>
          </section>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <CalendarClock size={14} aria-hidden="true" /> Publicado em {formatarData(anuncio.data_anuncio) ?? "—"}
            </span>
            {!isDono && (
              <button
                type="button"
                onClick={() => setIsDenunciaModalOpen(true)}
                className="inline-flex items-center gap-1.5 hover:text-red-700 transition-colors cursor-pointer"
              >
                <Flag size={14} aria-hidden="true" /> Denunciar anúncio
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* ─── Comprar lote ─── */}
      <Dialog open={isCompraModalOpen} onOpenChange={setIsCompraModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Comprar o lote inteiro?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">
            O pedido é enviado ao vendedor nas condições anunciadas. A venda é concluída quando ele confirmar.
          </DialogDescription>
          <dl className="mt-5 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
            {[
              ["Produto", nomeProduto],
              ["Lote", anuncio.ds_lote || "Não informado"],
              ["Quantidade", qtdTexto],
              ["Vendedor", vendedorNome],
              ["Valor total", brl(valorLote)],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500 shrink-0">{rotulo}</dt>
                <dd className={`text-right tabular-nums ${rotulo === "Valor total" ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setIsCompraModalOpen(false)} className={BTN_SECUNDARIO}>Cancelar</button>
            <button type="button" onClick={handleCompraDireta} className={BTN_PRIMARIO}>Enviar pedido de compra</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Fazer proposta ─── */}
      <Dialog open={isOfertaModalOpen} onOpenChange={setIsOfertaModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Fazer proposta</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">
            {aceitaParcial
              ? "Informe a quantidade e o valor total que você propõe pagar."
              : `Este anúncio não aceita compra parcial: a proposta vale pelo lote inteiro (${qtdTexto}).`}
          </DialogDescription>
          <div className="mt-5 space-y-4">
            {aceitaParcial && (
            <div>
              <label htmlFor="qtd-proposta" className="block text-sm font-medium text-slate-700 mb-1.5">
                Quantidade ({plural})
              </label>
              <input
                id="qtd-proposta"
                type="number"
                min={1}
                max={qtd}
                value={qtdProposta}
                onChange={(e) => setQtdProposta(e.target.value)}
                placeholder={`${qtd} (lote inteiro)`}
                className={INPUT}
              />
              <p className="mt-1 text-xs text-slate-500">Se deixar a quantidade em branco, a proposta vale pelo lote inteiro ({qtdTexto}).</p>
            </div>
            )}
            <div>
              <label htmlFor="valor-proposta" className="block text-sm font-medium text-slate-700 mb-1.5">
                Valor total proposto
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                <input
                  id="valor-proposta"
                  type="number"
                  step="0.01"
                  min={0}
                  value={valorProposta}
                  onChange={(e) => setValorProposta(e.target.value)}
                  placeholder="0,00"
                  className={`${INPUT} pl-9`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Obrigatório. O vendedor decide se aceita ou recusa.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setIsOfertaModalOpen(false)} className={BTN_SECUNDARIO}>Cancelar</button>
            <button type="button" onClick={handleProposta} className={BTN_PRIMARIO}>Enviar proposta</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Denunciar ─── */}
      <Dialog open={isDenunciaModalOpen} onOpenChange={setIsDenunciaModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Denunciar anúncio</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">
            Informe o motivo. A equipe do MedConnect vai analisar o anúncio.
          </DialogDescription>
          <fieldset className="mt-5 space-y-2">
            <legend className="sr-only">Motivo da denúncia</legend>
            {[
              "Informações incorretas ou enganosas",
              "Problema com validade ou lote",
              "Preço abusivo ou fora do mercado",
              "Produto com restrição regulatória",
              "Outro motivo",
            ].map((motivo) => (
              <label
                key={motivo}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors
                  ${motivoDenuncia === motivo ? "border-blue-600 bg-blue-50/60 text-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                <input
                  type="radio"
                  name="motivoDenuncia"
                  value={motivo}
                  checked={motivoDenuncia === motivo}
                  onChange={(e) => setMotivoDenuncia(e.target.value)}
                  className="accent-blue-700"
                />
                {motivo}
              </label>
            ))}
          </fieldset>
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => setIsDenunciaModalOpen(false)} className={BTN_SECUNDARIO}>Cancelar</button>
            <button type="button" onClick={handleDenunciarSubmit} className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors cursor-pointer">
              Enviar denúncia
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Mapa ─── */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="sm:max-w-lg p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Localização do vendedor</DialogTitle>
          {anuncio.anunciante_lat && anuncio.anunciante_lon && (
            <>
              <div className="mt-4 w-full h-64 rounded-lg overflow-hidden border border-slate-200">
                <iframe
                  title="Mapa da localização do vendedor"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${anuncio.anunciante_lat},${anuncio.anunciante_lon}&hl=pt-BR&z=15&output=embed`}
                />
              </div>
              {enderecoCompleto && <p className="mt-3 text-sm text-slate-600">{enderecoCompleto}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Sucesso ─── */}
      <Dialog open={isSuccessOpen} onOpenChange={(open) => { if (!open) handleCloseSuccess() }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">{successTitle}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">
            {successMessage}
            {successIrParaNegociacoes && " Acompanhe o andamento em Negociações › Enviadas."}
          </DialogDescription>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={handleCloseSuccess} className={BTN_PRIMARIO}>
              {successIrParaNegociacoes ? "Ver minhas negociações" : "Fechar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Erro ─── */}
      <Dialog open={isErrorOpen} onOpenChange={setIsErrorOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md p-6 gap-0 bg-white">
          <DialogTitle className="text-lg font-semibold text-slate-900">Não foi possível continuar</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-600">{errorMessage}</DialogDescription>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setIsErrorOpen(false)} className={BTN_SECUNDARIO}>Entendi</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
