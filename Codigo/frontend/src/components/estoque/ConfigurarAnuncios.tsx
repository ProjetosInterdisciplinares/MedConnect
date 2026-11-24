"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Coins, Eye, FileSpreadsheet, ImagePlus, Info,
  Loader2, Package, Sparkles, Upload, XCircle,
} from "lucide-react"
import { AvisoDialog, BOTAO, ConfirmarDialog, ModalPadrao, Resumo } from "@/components/ui/modal-padrao"
import { fmtMoeda, fmtNumero, unidade } from "@/components/estoque/rotulos"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"
import { AuthManager } from "@/lib/AuthManager"
import { notificarCreditosAtualizados } from "@/lib/creditos"
import { hojeISO } from "@/lib/format/hoje"
import { UNIDADES_MEDIDA } from "@/lib/format/unidade"
import { otimizarImagem } from "@/lib/imagem"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import servicesGetMatMed from "@/server/(GET)-mat-med"
import servicesGerarAnuncio from "@/server/(POST)-gerar-anuncio"
import servicesPublicarSugestoes from "@/server/(POST)-publicar-sugestoes"
import { AnaliseEstoque, ItemAnaliseEstoque, MatMed, PublicacaoSugestao } from "@/types"

const NOVO = "novo"
const CATEGORIAS = ["Material Hospitalar", "Medicamento"] as const
const LIMITE_DESCRICAO = 2000
const DESCRICAO_PADRAO =
  "Excedente de estoque em embalagem original lacrada, armazenado conforme as recomendações do fabricante.\n\n" +
  "Disponível para repasse a outra instituição de saúde."

type NovoInsumo = { ds_mat: string; ds_tipo: string; ds_marca: string; unidade_med: string; cd_tuss: string; cd_simpro: string; cd_brasindice: string }
type DadosAnuncio = {
  ds_lote: string; dt_fabricacao: string; dt_validade: string; qtd_mat: string; val_base: string
  val_minimo: string; ie_aceita_parcial: boolean; ds_obs: string; imagem_anuncio: string | null
}
type Linha = {
  item: ItemAnaliseEstoque
  publicar: boolean
  insumoSel: string
  novo: NovoInsumo
  anuncio: DadosAnuncio
  /** Valor base calculado pelo valor unitário: acompanha a quantidade até o usuário editar. */
  valorAuto: boolean
  errosServidor: string[]
}
type Erros = Partial<Record<keyof NovoInsumo | keyof DadosAnuncio | "insumo", string>>

// ── Preenchimento a partir da análise ────────────────────────────────

const TERMOS_MEDICAMENTO = /\b(\d+\s?(mg|mcg|ui|ml)|ampola|comprimido|c[aá]psula|frasco-ampola|xarope|injet[aá]vel|solu[cç][aã]o oral)\b/i

function categoriaProvavel(item: ItemAnaliseEstoque): string {
  const un = item.unidade.toLowerCase()
  if (["ampola", "comprimido", "cápsula", "capsula", "frasco-ampola", "blister"].includes(un)) return "Medicamento"
  return TERMOS_MEDICAMENTO.test(item.descricao) ? "Medicamento" : "Material Hospitalar"
}

function unidadeDaLista(texto: string): string {
  return UNIDADES_MEDIDA.find((u) => u.toLowerCase() === texto.trim().toLowerCase()) ?? ""
}

function valorDoLote(item: ItemAnaliseEstoque, quantidade: number): string {
  if (!item.valor_unitario || !quantidade) return ""
  return (item.valor_unitario * quantidade).toFixed(2).replace(".", ",")
}

function linhaInicial(item: ItemAnaliseEstoque): Linha {
  const qtd = item.qtd_sugerida || item.qtd_maxima
  const validade = item.validade_sugerida || item.validade_proxima || ""
  return {
    item,
    publicar: true,
    insumoSel: item.cd_mat ? String(item.cd_mat) : NOVO,
    novo: {
      ds_mat: item.descricao.slice(0, 255),
      ds_tipo: categoriaProvavel(item),
      ds_marca: "",
      unidade_med: unidadeDaLista(item.unidade),
      cd_tuss: "",
      cd_simpro: "",
      cd_brasindice: "",
    },
    anuncio: {
      ds_lote: item.lote_sugerido || "",
      dt_fabricacao: "",
      dt_validade: validade && validade >= hojeISO() ? validade : "",
      qtd_mat: qtd ? String(qtd) : "",
      val_base: valorDoLote(item, qtd),
      val_minimo: "",
      ie_aceita_parcial: true,
      ds_obs: DESCRICAO_PADRAO,
      imagem_anuncio: null,
    },
    valorAuto: !!item.valor_unitario,
    errosServidor: [],
  }
}

// ── Validação (mesmas regras do cadastro em massa no servidor) ────────

function numero(texto: string): number {
  return Number(texto.replace(/\./g, "").replace(",", ".").trim())
}

function validar(linha: Linha, reaproveitado?: MatMed): Erros {
  const e: Erros = {}
  const a = linha.anuncio
  if (linha.insumoSel === NOVO && reaproveitado) {
    // O servidor usa o insumo já cadastrado com este TUSS: os demais dados do insumo não são usados
  } else if (linha.insumoSel === NOVO) {
    const n = linha.novo
    if (!n.ds_mat.trim()) e.ds_mat = "Informe o nome do insumo."
    if (!CATEGORIAS.includes(n.ds_tipo as (typeof CATEGORIAS)[number])) e.ds_tipo = "Escolha a categoria."
    if (!n.ds_marca.trim()) e.ds_marca = "Informe a marca."
    if (!n.unidade_med) e.unidade_med = "Escolha a unidade."
    if (!n.cd_tuss.trim()) e.cd_tuss = "Informe o código TUSS."
    else if (n.cd_tuss.trim().length > 8) e.cd_tuss = "O TUSS tem até 8 caracteres."
    if (n.cd_simpro.trim().length > 10) e.cd_simpro = "O SIMPRO tem até 10 caracteres."
    if (n.cd_brasindice.trim().length > 15) e.cd_brasindice = "O Brasíndice tem até 15 caracteres."
  }
  if (!a.ds_lote.trim()) e.ds_lote = "Lote é obrigatório."
  if (!a.dt_fabricacao) e.dt_fabricacao = "Data de fabricação é obrigatória."
  if (!a.dt_validade) e.dt_validade = "Data de validade é obrigatória."
  else if (a.dt_validade < hojeISO()) e.dt_validade = "Produto vencido: a validade não pode ser anterior a hoje."
  else if (a.dt_fabricacao && a.dt_validade < a.dt_fabricacao) e.dt_validade = "A validade não pode ser anterior à fabricação."
  const qtd = Number(a.qtd_mat)
  if (!Number.isInteger(qtd) || qtd <= 0) e.qtd_mat = "Informe uma quantidade inteira maior que zero."
  const base = numero(a.val_base)
  if (!a.val_base.trim() || !(base > 0)) e.val_base = "Informe o valor do lote."
  if (a.val_minimo.trim()) {
    const minimo = numero(a.val_minimo)
    if (!(minimo > 0)) e.val_minimo = "Informe um valor mínimo maior que zero."
    else if (base > 0 && minimo > base) e.val_minimo = "O valor mínimo não pode ser maior que o valor base."
  }
  if (!a.ds_obs.trim()) e.ds_obs = "Descrição é obrigatória."
  else if (a.ds_obs.length > LIMITE_DESCRICAO) e.ds_obs = `Use até ${LIMITE_DESCRICAO} caracteres.`
  return e
}

function payload(linha: Linha): PublicacaoSugestao {
  const a = linha.anuncio
  const n = linha.novo
  return {
    chave: linha.item.chave,
    insumo: linha.insumoSel === NOVO
      ? {
          ds_mat: n.ds_mat.trim(), ds_tipo: n.ds_tipo, ds_marca: n.ds_marca.trim(), unidade_med: n.unidade_med,
          cd_tuss: n.cd_tuss.trim(), cd_simpro: n.cd_simpro.trim() || null, cd_brasindice: n.cd_brasindice.trim() || null,
        }
      : { cd_mat: Number(linha.insumoSel) },
    anuncio: {
      ds_lote: a.ds_lote.trim(),
      dt_fabricacao: a.dt_fabricacao,
      dt_validade: a.dt_validade,
      qtd_mat: Number(a.qtd_mat),
      val_base: a.val_base.replace(/\./g, "").replace(",", ".").trim(),
      val_minimo: a.val_minimo.trim() ? a.val_minimo.replace(/\./g, "").replace(",", ".").trim() : null,
      ie_aceita_parcial: a.ie_aceita_parcial,
      ds_obs: a.ds_obs.trim(),
      imagem_anuncio: a.imagem_anuncio,
    },
  }
}

// ── Componente ───────────────────────────────────────────────────────

interface Props {
  analise: AnaliseEstoque
  onVoltar: () => void
  onPublicado: (analise: AnaliseEstoque) => void
}

export default function ConfigurarAnuncios({ analise, onVoltar, onPublicado }: Props) {
  const router = useRouter()
  const custos = useCustosCreditos()
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    analise.itens.filter((i) => i.anunciar && !i.publicado).map(linhaInicial),
  )
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [aberta, setAberta] = useState<string | null>(null)
  const [tentouPublicar, setTentouPublicar] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erroGeral, setErroGeral] = useState("")
  const [sucesso, setSucesso] = useState<{ total: number; novos: number; restantes: number } | null>(null)
  const [semSaldo, setSemSaldo] = useState("")
  const [aviso, setAviso] = useState<{ titulo: string; mensagem: string } | null>(null)
  const [gerarPara, setGerarPara] = useState<string | null>(null)
  const [gerando, setGerando] = useState<string | null>(null)

  useEffect(() => {
    const userId = AuthManager.getInstance().getUserId() || 0
    servicesGetMatMed().then((resposta) => {
      if (!("isError" in resposta)) setMateriais(resposta.filter((m) => Number(m.ds_pessoaj) === Number(userId)))
    })
  }, [])

  const porTuss = useMemo(
    () => new Map(materiais.filter((m) => m.cd_tuss).map((m) => [String(m.cd_tuss).trim(), m])),
    [materiais],
  )
  /** Linha de insumo novo cujo TUSS já existe: a publicação reaproveita esse insumo. */
  const reaproveitado = (l: Linha) => (l.insumoSel === NOVO ? porTuss.get(l.novo.cd_tuss.trim()) : undefined)
  const erros = useMemo(
    () => Object.fromEntries(linhas.map((l) => [l.item.chave, validar(l, reaproveitado(l))])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linhas, porTuss],
  )
  const selecionadas = linhas.filter((l) => l.publicar)
  const prontas = selecionadas.filter((l) => Object.keys(erros[l.item.chave]).length === 0 && l.errosServidor.length === 0)
  const pendentes = selecionadas.length - prontas.length
  const novosInsumos = selecionadas.filter((l) => l.insumoSel === NOVO && !reaproveitado(l)).length
  const custoTotal = rotuloCreditos(custos.publicacao === null ? null : selecionadas.length * custos.publicacao)

  function atualizar(chave: string, mudar: (l: Linha) => Linha) {
    setLinhas((atual) => atual.map((l) => (l.item.chave === chave ? { ...mudar(l), errosServidor: [] } : l)))
  }

  function mudarAnuncio(chave: string, campo: keyof DadosAnuncio, valor: string | boolean | null) {
    atualizar(chave, (l) => {
      const anuncio = { ...l.anuncio, [campo]: valor }
      let valorAuto = l.valorAuto
      if (campo === "val_base") valorAuto = false
      if (campo === "qtd_mat" && valorAuto) anuncio.val_base = valorDoLote(l.item, Number(valor))
      return { ...l, anuncio, valorAuto }
    })
  }

  function mudarNovo(chave: string, campo: keyof NovoInsumo, valor: string) {
    atualizar(chave, (l) => ({ ...l, novo: { ...l.novo, [campo]: valor } }))
  }

  function pedirPublicacao() {
    setTentouPublicar(true)
    setErroGeral("")
    if (selecionadas.length === 0) {
      setErroGeral("Selecione ao menos um anúncio para publicar.")
      return
    }
    if (pendentes > 0) {
      const primeira = selecionadas.find((l) => !prontas.includes(l))
      if (primeira) setAberta(primeira.item.chave)
      setErroGeral(`Complete os campos destacados em ${pendentes} anúncio(s) antes de publicar.`)
      return
    }
    setConfirmar(true)
  }

  async function publicar() {
    setPublicando(true)
    const enviadas = selecionadas
    const resposta = await servicesPublicarSugestoes(analise.id, enviadas.map(payload))
    setPublicando(false)
    setConfirmar(false)

    if ("isError" in resposta) {
      if (resposta.status === 402) {
        setSemSaldo(`publicar ${enviadas.length} anúncio(s) (${custoTotal})`)
      } else if ("detalhes" in resposta && resposta.detalhes?.length) {
        const porChave = new Map(resposta.detalhes.map((d) => [enviadas[d.index]?.item.chave, d.erros]))
        setLinhas((atual) => atual.map((l) => (porChave.has(l.item.chave) ? { ...l, errosServidor: porChave.get(l.item.chave) ?? [] } : l)))
        setAberta(enviadas[resposta.detalhes[0].index]?.item.chave ?? null)
        setErroGeral(`O servidor recusou ${resposta.detalhes.length} anúncio(s). Nada foi publicado nem cobrado: corrija os pontos destacados.`)
      } else {
        setErroGeral(resposta.message)
      }
      return
    }

    setSucesso({
      total: resposta.total_criados,
      novos: enviadas.filter((l) => l.insumoSel === NOVO && !reaproveitado(l)).length,
      restantes: resposta.analise.itens.filter((i) => i.anunciar && !i.publicado).length,
    })
    onPublicado(resposta.analise)
    servicesGetCreditosSaldo().then((res) => {
      if (!("isError" in res)) notificarCreditosAtualizados(res.saldo)
    })
  }

  async function gerarDescricao(chave: string) {
    setGerarPara(null)
    const linha = linhas.find((l) => l.item.chave === chave)
    if (!linha) return
    setGerando(chave)
    const pedido = linha.insumoSel === NOVO
      ? { insumo: { ds_mat: linha.novo.ds_mat, ds_tipo: linha.novo.ds_tipo, unidade_med: linha.novo.unidade_med } }
      : { cd_mat: Number(linha.insumoSel) }
    const resposta = await (servicesGerarAnuncio as unknown as (p: object) => ReturnType<typeof servicesGerarAnuncio>)(pedido)
    setGerando(null)
    if ("isError" in resposta) {
      if (resposta.status === 402) setSemSaldo(`gerar a descrição com IA (${rotuloCreditos(custos.ia)})`)
      else setAviso({ titulo: "Não foi possível gerar a descrição", mensagem: resposta.message })
      return
    }
    mudarAnuncio(chave, "ds_obs", resposta.texto_sugerido)
    servicesGetCreditosSaldo().then((res) => {
      if (!("isError" in res)) notificarCreditosAtualizados(res.saldo)
    })
  }

  async function escolherFoto(chave: string, arquivo: File | undefined) {
    if (!arquivo) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type)) {
      setAviso({ titulo: "Formato não aceito", mensagem: "Envie uma imagem PNG, JPG ou WEBP." })
      return
    }
    if (arquivo.size > 20 * 1024 * 1024) {
      setAviso({ titulo: "Imagem muito grande", mensagem: "Envie uma imagem de até 20 MB." })
      return
    }
    try {
      mudarAnuncio(chave, "imagem_anuncio", await otimizarImagem(arquivo))
    } catch {
      setAviso({ titulo: "Erro de leitura", mensagem: "Não foi possível ler o arquivo de imagem." })
    }
  }

  if (linhas.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm text-center">
        <CheckCircle size={32} className="mx-auto text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 font-bold text-slate-800">Nenhuma sugestão pendente</h2>
        <p className="text-sm text-slate-500 mt-1">Todas as sugestões desta análise já foram publicadas ou não há itens para anunciar.</p>
        <button type="button" onClick={onVoltar} className={`${BOTAO.secundario} mt-5`}><ArrowLeft size={16} aria-hidden="true" /> Voltar para a análise</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Cartao rotulo="Sugestões" valor={linhas.length} />
        <Cartao rotulo="Selecionados" valor={selecionadas.length} cor="text-blue-800" borda="border-blue-100" />
        <Cartao rotulo="Com pendências" valor={pendentes} cor="text-amber-600" borda="border-amber-100" />
        <Cartao rotulo="Novos insumos" valor={novosInsumos} cor="text-amber-600" borda="border-amber-100" />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} className="text-emerald-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{analise.nome_arquivo}</p>
            <p className="text-xs text-slate-500">{prontas.length} de {selecionadas.length} anúncio(s) selecionados prontos para publicar</p>
          </div>
        </div>
        <button type="button" onClick={onVoltar} className={BOTAO.secundario}>
          <ArrowLeft size={16} aria-hidden="true" /> Voltar para a análise
        </button>
      </div>

      <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-700">
        <Info size={16} className="text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          A análise já preencheu quantidade, lote, validade e, quando a planilha tinha valor unitário, o valor do lote pelo
          <span className="font-semibold"> custo</span> (ajuste para o preço de repasse). Complete a data de fabricação e confira os dados.
          Materiais que ainda não são insumos cadastrados são <span className="font-semibold">cadastrados na publicação</span>.
          <span className="block mt-1">
            Cada anúncio usa <span className="font-semibold">{rotuloCreditos(custos.publicacao)}</span>. Desmarque os que não quiser agora: a análise
            fica salva e você volta depois em <span className="font-semibold">Análises salvas</span> para publicar o restante.
          </span>
        </p>
      </div>

      {/* Linhas */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-6 py-4">
          <h3 className="text-white font-bold flex items-center gap-2"><Eye size={18} aria-hidden="true" /> Configuração dos anúncios</h3>
          <p className="text-blue-200 text-sm mt-1">Revise cada anúncio. Desmarque os que não deseja publicar.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {linhas.map((linha) => {
            const chave = linha.item.chave
            const errosLinha = erros[chave]
            const qtdErros = Object.keys(errosLinha).length + linha.errosServidor.length
            const mostrarErros = tentouPublicar || linha.errosServidor.length > 0
            const ok = qtdErros === 0
            const material = materiais.find((m) => String(m.cd_mat) === linha.insumoSel)
            const existente = reaproveitado(linha)
            const aberto = aberta === chave
            return (
              <li key={chave} className={!linha.publicar ? "bg-slate-50/80" : mostrarErros && !ok ? "bg-red-50/40" : "bg-white"}>
                <div className="px-6 py-4 flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={linha.publicar}
                    onChange={(e) => atualizar(chave, (l) => ({ ...l, publicar: e.target.checked }))}
                    aria-label={`Publicar ${linha.item.descricao}`}
                    className="h-5 w-5 accent-blue-800 cursor-pointer shrink-0"
                  />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ok ? "bg-emerald-50" : mostrarErros ? "bg-red-100" : "bg-amber-50"}`}>
                    {ok ? <CheckCircle size={16} className="text-emerald-500" aria-label="Pronto" />
                      : mostrarErros ? <XCircle size={16} className="text-red-500" aria-label="Com erros" />
                      : <AlertTriangle size={16} className="text-amber-500" aria-label="Com pendências" />}
                  </div>
                  <button type="button" onClick={() => setAberta(aberto ? null : chave)} aria-expanded={aberto} className={`flex-1 min-w-0 text-left cursor-pointer ${linha.publicar ? "" : "opacity-50"}`}>
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800 break-words">{linha.item.descricao}</span>
                      {linha.insumoSel === NOVO && !existente
                        ? <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">NOVO INSUMO</span>
                        : <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">JÁ CADASTRADO</span>}
                      {!ok && <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${mostrarErros ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{qtdErros} PENDÊNCIA{qtdErros > 1 ? "S" : ""}</span>}
                    </span>
                    <span className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                      <span>Lote: {linha.anuncio.ds_lote || "—"}</span><span aria-hidden="true">·</span>
                      <span>Qtd: {linha.anuncio.qtd_mat || "—"}</span><span aria-hidden="true">·</span>
                      <span className="font-bold text-blue-900">R$ {linha.anuncio.val_base || "—"}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => setAberta(aberto ? null : chave)} aria-label={aberto ? "Recolher" : "Configurar"} className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0">
                    {aberto ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                </div>

                {aberto && (
                  <div className="px-6 pb-6 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                    {linha.errosServidor.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1"><AlertTriangle size={12} aria-hidden="true" /> O servidor recusou este anúncio:</p>
                        <ul className="space-y-1">{linha.errosServidor.map((e, i) => <li key={i} className="text-xs text-red-600">• {e}</li>)}</ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                      {/* Insumo */}
                      <section className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1"><Package size={12} aria-hidden="true" /> Dados do Insumo</h4>
                        <p className={`text-xs rounded-lg px-3 py-2 border ${
                          linha.insumoSel !== NOVO || existente ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-100 text-amber-800"
                        }`}>
                          {linha.insumoSel !== NOVO
                            ? "Insumo já cadastrado, vinculado a este material pela análise (código ou nome). O anúncio usa os dados abaixo."
                            : existente
                              ? <>O TUSS {linha.novo.cd_tuss.trim()} já é do insumo cadastrado <span className="font-semibold">{existente.ds_mat}</span>: o anúncio vai usar esse insumo e nada novo será cadastrado.</>
                              : "Este material ainda não é um insumo cadastrado: ele será cadastrado junto com o anúncio. Se ele já existir com outro nome, informe o mesmo código TUSS para reaproveitá-lo."}
                        </p>
                        {linha.insumoSel === NOVO && existente ? (
                          <div className="space-y-3">
                            <Campo rotulo="Código TUSS" obrigatorio erro={mostrarErros ? errosLinha.cd_tuss : undefined}>
                              <input value={linha.novo.cd_tuss} onChange={(e) => mudarNovo(chave, "cd_tuss", e.target.value)} maxLength={8} inputMode="numeric" className={estiloCampo(mostrarErros && !!errosLinha.cd_tuss)} />
                            </Campo>
                            <DadosInsumo dados={existente} />
                          </div>
                        ) : linha.insumoSel === NOVO ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Campo rotulo="Nome do insumo" obrigatorio erro={mostrarErros ? errosLinha.ds_mat : undefined} largo>
                              <input value={linha.novo.ds_mat} onChange={(e) => mudarNovo(chave, "ds_mat", e.target.value)} maxLength={255} className={estiloCampo(mostrarErros && !!errosLinha.ds_mat)} />
                            </Campo>
                            <Campo rotulo="Categoria" obrigatorio erro={mostrarErros ? errosLinha.ds_tipo : undefined}>
                              <select value={linha.novo.ds_tipo} onChange={(e) => mudarNovo(chave, "ds_tipo", e.target.value)} className={estiloCampo(mostrarErros && !!errosLinha.ds_tipo)}>
                                <option value="">Selecione</option>
                                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </Campo>
                            <Campo rotulo="Unidade de medida" obrigatorio erro={mostrarErros ? errosLinha.unidade_med : undefined}>
                              <select value={linha.novo.unidade_med} onChange={(e) => mudarNovo(chave, "unidade_med", e.target.value)} className={estiloCampo(mostrarErros && !!errosLinha.unidade_med)}>
                                <option value="">Selecione</option>
                                {UNIDADES_MEDIDA.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </Campo>
                            <Campo rotulo="Marca" obrigatorio erro={mostrarErros ? errosLinha.ds_marca : undefined}>
                              <input value={linha.novo.ds_marca} onChange={(e) => mudarNovo(chave, "ds_marca", e.target.value)} placeholder="Ex: BD" className={estiloCampo(mostrarErros && !!errosLinha.ds_marca)} />
                            </Campo>
                            <Campo rotulo="Código TUSS" obrigatorio erro={mostrarErros ? errosLinha.cd_tuss : undefined}>
                              <input value={linha.novo.cd_tuss} onChange={(e) => mudarNovo(chave, "cd_tuss", e.target.value)} maxLength={8} inputMode="numeric" placeholder="Até 8 dígitos" className={estiloCampo(mostrarErros && !!errosLinha.cd_tuss)} />
                            </Campo>
                            <Campo rotulo="Código SIMPRO" erro={mostrarErros ? errosLinha.cd_simpro : undefined}>
                              <input value={linha.novo.cd_simpro} onChange={(e) => mudarNovo(chave, "cd_simpro", e.target.value)} maxLength={10} className={estiloCampo(mostrarErros && !!errosLinha.cd_simpro)} />
                            </Campo>
                            <Campo rotulo="Código Brasíndice" erro={mostrarErros ? errosLinha.cd_brasindice : undefined}>
                              <input value={linha.novo.cd_brasindice} onChange={(e) => mudarNovo(chave, "cd_brasindice", e.target.value)} maxLength={15} className={estiloCampo(mostrarErros && !!errosLinha.cd_brasindice)} />
                            </Campo>
                            <p className="sm:col-span-2 text-[11px] text-slate-500">Categoria e unidade foram sugeridas pela descrição do material: confira antes de publicar.</p>
                          </div>
                        ) : (
                          <DadosInsumo dados={material ?? linha.item.insumo} />
                        )}
                      </section>

                      {/* Anúncio */}
                      <section className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1"><FileSpreadsheet size={12} aria-hidden="true" /> Dados do Anúncio</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Campo rotulo="Lote" obrigatorio erro={mostrarErros ? errosLinha.ds_lote : undefined}>
                            <input value={linha.anuncio.ds_lote} onChange={(e) => mudarAnuncio(chave, "ds_lote", e.target.value)} placeholder="Ex: L123456" className={estiloCampo(mostrarErros && !!errosLinha.ds_lote)} />
                          </Campo>
                          <Campo rotulo="Fabricação" obrigatorio erro={mostrarErros ? errosLinha.dt_fabricacao : undefined}>
                            <input type="date" max={hojeISO()} value={linha.anuncio.dt_fabricacao} onChange={(e) => mudarAnuncio(chave, "dt_fabricacao", e.target.value)} className={estiloCampo(mostrarErros && !!errosLinha.dt_fabricacao)} />
                          </Campo>
                          <Campo rotulo="Validade" obrigatorio erro={mostrarErros ? errosLinha.dt_validade : undefined}>
                            <input type="date" min={hojeISO()} value={linha.anuncio.dt_validade} onChange={(e) => mudarAnuncio(chave, "dt_validade", e.target.value)} className={estiloCampo(mostrarErros && !!errosLinha.dt_validade)} />
                          </Campo>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Campo rotulo="Quantidade" obrigatorio erro={mostrarErros ? errosLinha.qtd_mat : undefined}
                            ajuda={`Sugerido: ${fmtNumero(linha.item.qtd_sugerida)} · saldo válido: ${fmtNumero(linha.item.qtd_maxima)} ${unidade(linha.item.unidade)}`}>
                            <input type="number" min={1} step={1} value={linha.anuncio.qtd_mat} onChange={(e) => mudarAnuncio(chave, "qtd_mat", e.target.value)} className={estiloCampo(mostrarErros && !!errosLinha.qtd_mat)} />
                          </Campo>
                          <Campo rotulo="Valor do lote (R$)" obrigatorio erro={mostrarErros ? errosLinha.val_base : undefined}
                            ajuda={linha.item.valor_unitario
                              ? `Preenchido com qtd × ${fmtMoeda(linha.item.valor_unitario)} (custo unitário da planilha). Ajuste para o preço de repasse.`
                              : "Valor total do lote anunciado"}>
                            <input inputMode="decimal" value={linha.anuncio.val_base} onChange={(e) => mudarAnuncio(chave, "val_base", e.target.value)} placeholder="Ex: 1590,00" className={estiloCampo(mostrarErros && !!errosLinha.val_base)} />
                          </Campo>
                          <Campo rotulo="Valor mínimo aceito (R$)" erro={mostrarErros ? errosLinha.val_minimo : undefined} ajuda="Opcional. Propostas abaixo dele são recusadas.">
                            <input inputMode="decimal" value={linha.anuncio.val_minimo} onChange={(e) => mudarAnuncio(chave, "val_minimo", e.target.value)} placeholder="Ex: 1200,00" className={estiloCampo(mostrarErros && !!errosLinha.val_minimo)} />
                          </Campo>
                          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 cursor-pointer sm:mt-5 self-start">
                            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-700 cursor-pointer" checked={linha.anuncio.ie_aceita_parcial} onChange={(e) => mudarAnuncio(chave, "ie_aceita_parcial", e.target.checked)} />
                            <span>
                              <span className="block text-sm font-semibold text-slate-700">Aceito compra parcial</span>
                              <span className="block text-[11px] text-slate-500">Se desmarcado, só é possível comprar o lote inteiro.</span>
                            </span>
                          </label>
                        </div>
                      </section>

                      {/* Descrição */}
                      <section className="bg-slate-50 rounded-xl p-4 border border-slate-100 2xl:col-span-2">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <label htmlFor={`desc-${chave}`} className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            Descrição do anúncio <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setGerarPara(chave)}
                            disabled={gerando === chave}
                            className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            {gerando === chave
                              ? <><Loader2 size={14} className="animate-spin text-slate-500" aria-hidden="true" /> Gerando…</>
                              : <><Sparkles size={14} className="text-blue-700" aria-hidden="true" /> Gerar descrição com IA <span className="ml-1 pl-2 border-l border-slate-200 font-normal text-slate-500">{rotuloCreditos(custos.ia)}</span></>}
                          </button>
                        </div>
                        <textarea
                          id={`desc-${chave}`}
                          rows={4}
                          value={linha.anuncio.ds_obs}
                          maxLength={LIMITE_DESCRICAO}
                          onChange={(e) => mudarAnuncio(chave, "ds_obs", e.target.value)}
                          className={`${estiloCampo(mostrarErros && !!errosLinha.ds_obs)} h-auto py-2 resize-y`}
                        />
                        {mostrarErros && errosLinha.ds_obs && <p className="text-xs text-red-500 mt-1">{errosLinha.ds_obs}</p>}
                      </section>

                      {/* Foto */}
                      <section className="bg-slate-50 rounded-xl p-4 border border-slate-100 2xl:col-span-2">
                        <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1"><ImagePlus size={12} aria-hidden="true" /> Foto do Anúncio (Opcional)</h4>
                        <div className="flex items-center gap-4">
                          {linha.anuncio.imagem_anuncio ? (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={linha.anuncio.imagem_anuncio} alt="Prévia da foto" className="w-full h-full object-contain" />
                              <button type="button" onClick={() => mudarAnuncio(chave, "imagem_anuncio", null)} aria-label="Remover foto" className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer">
                                <XCircle size={14} aria-hidden="true" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors shrink-0">
                              <ImagePlus size={20} className="text-slate-400 mb-1" aria-hidden="true" />
                              <span className="text-[10px] font-bold text-slate-500 text-center px-1">Adicionar Foto</span>
                              <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => { escolherFoto(chave, e.target.files?.[0]); e.target.value = "" }} />
                            </label>
                          )}
                          <p className="text-xs text-slate-500 leading-relaxed">PNG, JPG ou WEBP de até 20 MB. Fotos grandes são reduzidas sem cortar. Prefira fotos bem iluminadas do lote ou da caixa original.</p>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Barra de publicação (mesmo padrão do cadastro em massa) */}
      <div className="space-y-4">
        {erroGeral && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3" role="alert">
            <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800">Não foi possível publicar</h4>
              <p className="text-sm text-red-600 mt-1">{erroGeral}</p>
            </div>
          </div>
        )}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" aria-hidden="true" /> Deseja publicar os anúncios sugeridos?
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {selecionadas.length} anúncio(s) selecionados serão publicados no catálogo.
                {novosInsumos > 0 && <span className="text-amber-600 font-semibold"> {novosInsumos} novo(s) insumo(s) serão cadastrados automaticamente.</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {selecionadas.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap">
                  <Coins size={15} className="text-slate-400" aria-hidden="true" /> Custo: <span className="font-semibold text-slate-700 tabular-nums">{custoTotal}</span>
                </span>
              )}
              <button
                type="button"
                onClick={pedirPublicacao}
                disabled={publicando || selecionadas.length === 0}
                className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {publicando ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Publicando…</> : <><Upload size={16} aria-hidden="true" /> Publicar todos ({selecionadas.length})</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmarDialog
        open={confirmar}
        onOpenChange={(open) => { if (!publicando) setConfirmar(open) }}
        titulo={`Publicar ${selecionadas.length} anúncio(s)?`}
        mensagem="Os créditos são descontados do seu saldo na publicação."
        confirmar={`Publicar (${custoTotal})`}
        carregando={publicando}
        onConfirmar={publicar}
      >
        <Resumo itens={[["Anúncios selecionados", selecionadas.length], ["Novos insumos", novosInsumos], ["Custo total", custoTotal]]} />
      </ConfirmarDialog>

      <ConfirmarDialog
        open={gerarPara !== null}
        onOpenChange={(open) => { if (!open) setGerarPara(null) }}
        titulo="Gerar descrição com IA?"
        mensagem="A IA sugere um texto a partir do insumo informado. Revise antes de publicar."
        confirmar="Gerar descrição"
        onConfirmar={() => gerarPara && gerarDescricao(gerarPara)}
      >
        <Resumo itens={[["Custo", rotuloCreditos(custos.ia)]]} />
      </ConfirmarDialog>

      <ModalPadrao
        open={sucesso !== null}
        onOpenChange={(open) => { if (!open) { setSucesso(null); onVoltar() } }}
        titulo="Anúncios publicados"
        descricao={`${sucesso?.total ?? 0} anúncio(s) já estão visíveis no catálogo para as outras instituições.${sucesso?.novos ? ` ${sucesso.novos} insumo(s) novo(s) foram cadastrados.` : ""}${
          sucesso?.restantes ? ` Ainda restam ${sucesso.restantes} sugestão(ões): volte a esta análise em Análises salvas quando quiser publicá-las.` : ""}`}
        acoes={
          <>
            <button type="button" onClick={() => { setSucesso(null); onVoltar() }} className={BOTAO.secundario}>Voltar para a análise</button>
            <button type="button" onClick={() => router.push("/meus-anuncios")} className={BOTAO.primario}>Ver meus anúncios</button>
          </>
        }
      />

      <ModalPadrao
        open={semSaldo !== ""}
        onOpenChange={(open) => { if (!open) setSemSaldo("") }}
        titulo="Saldo insuficiente"
        descricao={`Você não tem créditos suficientes para ${semSaldo}. Compre um pacote na Central de Créditos para continuar.`}
        acoes={
          <>
            <button type="button" onClick={() => setSemSaldo("")} className={BOTAO.secundario}>Agora não</button>
            <button type="button" onClick={() => router.push("/creditos")} className={BOTAO.primario}>Ver pacotes de créditos</button>
          </>
        }
      />

      <AvisoDialog open={aviso !== null} onClose={() => setAviso(null)} titulo={aviso?.titulo ?? ""} mensagem={aviso?.mensagem ?? ""} />
    </div>
  )
}

function DadosInsumo({ dados }: {
  dados?: { ds_mat?: string | null; ds_tipo?: string | null; ds_marca?: string | null; unidade_med?: string | null; cd_tuss?: string | null } | null
}) {
  return (
    <dl className="space-y-2 text-sm">
      {[
        ["Nome", dados?.ds_mat],
        ["Categoria", dados?.ds_tipo],
        ["Marca", dados?.ds_marca],
        ["Unidade", dados?.unidade_med],
        ["TUSS", dados?.cd_tuss],
      ].map(([r, v]) => (
        <div key={r} className="flex justify-between gap-4">
          <dt className="text-slate-500">{r}</dt>
          <dd className="font-semibold text-slate-800 text-right break-words min-w-0">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

function Cartao({ rotulo, valor, cor = "text-slate-800", borda = "border-slate-100" }: { rotulo: string; valor: number; cor?: string; borda?: string }) {
  return (
    <div className={`bg-white border ${borda} rounded-2xl p-4 shadow-sm`}>
      <p className="text-xs text-slate-500 font-medium mb-1">{rotulo}</p>
      <p className={`text-2xl font-black tabular-nums ${cor}`}>{valor}</p>
    </div>
  )
}

function estiloCampo(erro = false) {
  return `w-full h-10 px-3 rounded-xl border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 ${
    erro ? "border-red-300 focus:ring-red-400/40" : "border-slate-200 focus:ring-blue-900/20 focus:border-blue-900"
  }`
}

function Campo({ rotulo, obrigatorio, erro, ajuda, largo, children }: {
  rotulo: string; obrigatorio?: boolean; erro?: string; ajuda?: string; largo?: boolean; children: React.ReactElement
}) {
  const id = React.useId()
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${largo ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-xs font-semibold text-slate-700">
        {rotulo} {obrigatorio && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {React.cloneElement(children as React.ReactElement<{ id?: string; "aria-invalid"?: boolean }>, { id, "aria-invalid": !!erro })}
      {erro ? <p className="text-xs text-red-500">{erro}</p> : ajuda ? <p className="text-[11px] text-slate-500">{ajuda}</p> : null}
    </div>
  )
}
