"use client"

import Link from "next/link"
import React, { useMemo, useState } from "react"
import {
  AlertOctagon, ArrowRight, BarChart3, Calendar, CheckCircle, Coins, ChevronDown, Download, FileSpreadsheet, History,
  Info, Loader2, Megaphone, PackagePlus, Repeat, Search, Sparkles, Upload,
} from "lucide-react"
import RotuloExplicado from "@/components/estoque/RotuloExplicado"
import { AlertaEstoque, AnaliseEstoque, ItemAnaliseEstoque, PerfilEstoque } from "@/types"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"
import {
  EXPLICACOES, PERFIS, PRIORIDADES, SINAIS, fmtData, fmtDataHora, fmtMoeda, fmtNumero, unidade,
} from "@/components/estoque/rotulos"

type Filtro = "sugeridos" | "todos" | PerfilEstoque
const POR_PAGINA = 25

/** Únicos alertas mostrados na página (os demais ficam no relatório e no histórico). */
const ALERTA_VENCIDOS = "Lotes vencidos em estoque"
const ALERTA_TRANSFERENCIAS = "Transferências internas ignoradas"
const ALERTA_SEM_IA = "Análise feita sem a IA"

/** Colunas da lista (pela largura da própria lista): Material | Situação | Saldo | Consumo/mês (listas largas) | Cobertura | Anunciar | abrir */
const COLUNAS =
  "@2xl:grid @2xl:grid-cols-[minmax(0,1fr)_8.75rem_3.75rem_5.25rem_5.25rem_2.25rem] " +
  "@5xl:grid-cols-[minmax(0,1fr)_9.5rem_4.5rem_5.5rem_5.5rem_6rem_2.25rem] @2xl:items-center @2xl:gap-3"

interface Props {
  analise: AnaliseEstoque
  baixandoRelatorio: boolean
  onBaixarRelatorio: () => void
  onNovaAnalise: () => void
  onConfigurar: () => void
}

export default function ResultadoAnalise({ analise, baixandoRelatorio, onBaixarRelatorio, onNovaAnalise, onConfigurar }: Props) {
  const custoAnuncio = rotuloCreditos(useCustosCreditos().publicacao)
  const [filtro, setFiltro] = useState<Filtro>(analise.total_sugeridos > 0 ? "sugeridos" : "todos")
  const [busca, setBusca] = useState("")
  const [limite, setLimite] = useState(POR_PAGINA)
  const [aberto, setAberto] = useState<string | null>(null)

  const ind = analise.indicadores
  const perfis = ind.perfis
  const pendentes = analise.itens.filter((i) => i.anunciar && !i.publicado)
  const publicados = analise.itens.filter((i) => i.publicado).length
  const novosInsumos = pendentes.filter((i) => !i.cd_mat).length
  const vencidos = analise.alertas.find((a) => a.titulo === ALERTA_VENCIDOS)
  const transferencias = analise.alertas.find((a) => a.titulo === ALERTA_TRANSFERENCIAS)
  const semIA = analise.alertas.find((a) => a.titulo === ALERTA_SEM_IA)

  const filtros: { chave: Filtro; rotulo: string; total: number; explicacao: string }[] = [
    { chave: "sugeridos", rotulo: "Sugeridos para anunciar", total: analise.itens.filter((i) => i.anunciar).length, explicacao: EXPLICACOES.sugerido },
    { chave: "sem_giro", rotulo: "Sem giro", total: perfis.sem_giro, explicacao: PERFIS.sem_giro.explicacao },
    { chave: "risco_vencimento", rotulo: "Risco de vencimento", total: perfis.risco_vencimento, explicacao: PERFIS.risco_vencimento.explicacao },
    { chave: "giro_raro", rotulo: "Uso pontual", total: perfis.giro_raro, explicacao: PERFIS.giro_raro.explicacao },
    { chave: "excesso", rotulo: "Excesso", total: perfis.excesso, explicacao: PERFIS.excesso.explicacao },
    { chave: "estoque_baixo", rotulo: "Estoque baixo", total: perfis.estoque_baixo, explicacao: PERFIS.estoque_baixo.explicacao },
    { chave: "todos", rotulo: "Todos", total: analise.itens.length, explicacao: "Todos os materiais da planilha." },
  ]

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return analise.itens.filter((item) => {
      if (filtro === "sugeridos" && !item.anunciar) return false
      if (filtro !== "sugeridos" && filtro !== "todos" && item.perfil !== filtro) return false
      return !termo || item.descricao.toLowerCase().includes(termo) || item.codigo.toLowerCase().includes(termo)
    })
  }, [analise.itens, filtro, busca])

  function escolherFiltro(chave: Filtro) {
    setFiltro(chave)
    setLimite(POR_PAGINA)
    setAberto(null)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da análise */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={22} className="text-emerald-600" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 truncate">{analise.nome_arquivo || "Planilha de estoque"}</h2>
                {analise.ia_utilizada ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                    <Sparkles size={11} aria-hidden="true" /> Analisado com IA
                  </span>
                ) : (
                  <RotuloExplicado
                    titulo="Análise estatística"
                    explicacao={semIA?.mensagem ?? "A análise foi feita só com os cálculos de consumo e cobertura, sem a IA. Nenhum crédito foi cobrado."}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold"
                  >
                    <BarChart3 size={11} aria-hidden="true" /> Análise estatística <Info size={11} aria-hidden="true" />
                  </RotuloExplicado>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="inline-flex items-center gap-1"><Calendar size={12} aria-hidden="true" />
                  Movimentações de {fmtData(analise.periodo_inicio)} a {fmtData(analise.periodo_fim)} ({analise.dias_periodo} dias)
                </span>
                <span>Horizonte de {analise.horizonte_dias} dias</span>
                <span className="inline-flex items-center gap-1"><History size={12} aria-hidden="true" /> Salva em {fmtDataHora(analise.criado_em)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBaixarRelatorio}
              disabled={baixandoRelatorio}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {baixandoRelatorio ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
              Baixar relatório
            </button>
            <button
              type="button"
              onClick={onNovaAnalise}
              className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              Nova análise
            </button>
          </div>
        </div>
      </div>

      {/* Alertas resumidos: só lotes vencidos e transferências internas */}
      {(vencidos || transferencias) && (
        <div className="space-y-2">
          {vencidos && <AlertaCurto alerta={vencidos} critico />}
          {transferencias && <AlertaCurto alerta={transferencias} />}
        </div>
      )}

      {/* Resumo da IA */}
      {analise.resumo_ia && (
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-5 md:p-6">
          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <Sparkles size={16} aria-hidden="true" /> Resumo da IA
          </h3>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">{analise.resumo_ia}</p>
          {analise.recomendacoes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {analise.recomendacoes.map((r, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <ArrowRight size={14} className="text-blue-700 shrink-0 mt-1" aria-hidden="true" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4">
        <Indicador rotulo="Materiais analisados" valor={fmtNumero(ind.total_materiais)} detalhe={`${fmtNumero(ind.total_movimentacoes)} movimentações`} />
        <Indicador rotulo="Sugeridos para anunciar" valor={fmtNumero(ind.total_sugeridos)} detalhe={`${fmtNumero(ind.prioridade_alta)} com prioridade alta`} cor="text-blue-800" borda="border-blue-100" />
      </div>

      {/* Itens */}
      <section className="@container bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 pt-5 pb-4 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800">Itens do estoque</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique em um item para ver a justificativa. Passe o mouse ou toque nas etiquetas para ver o que significam.
              </p>
              <ul className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500" aria-label="Legenda">
                <li className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="w-1 h-3.5 rounded-full bg-blue-600" aria-hidden="true" /> Sugerido para anunciar</li>
                <li className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="w-1 h-3.5 rounded-full bg-emerald-500" aria-hidden="true" /> Já publicado</li>
              </ul>
            </div>
            <label className="relative w-full md:w-72">
              <span className="sr-only">Buscar material</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setLimite(POR_PAGINA) }}
                placeholder="Buscar por nome ou código"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1" role="tablist" aria-label="Filtrar itens">
            {filtros.map((f) => (
              <button
                key={f.chave}
                type="button"
                role="tab"
                title={f.explicacao}
                aria-selected={filtro === f.chave}
                onClick={() => escolherFiltro(f.chave)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filtro === f.chave ? "bg-blue-700 border-blue-700 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {f.rotulo} <span className={`ml-1 tabular-nums ${filtro === f.chave ? "text-blue-100" : "text-slate-400"}`}>{f.total}</span>
              </button>
            ))}
          </div>
        </div>

        {itens.length === 0 ? (
          <p className="px-6 py-10 text-sm text-slate-500 text-center">
            {busca ? "Nenhum item encontrado para essa busca." : "Nenhum item nesta categoria."}
          </p>
        ) : (
          <>
            {/* Cabeçalho das colunas (telas médias e maiores) */}
            <div className={`hidden ${COLUNAS} px-6 py-3 bg-slate-50 border-b border-slate-100 border-l-4 border-l-transparent text-xs font-semibold uppercase tracking-wide text-slate-500`}>
              <span>Material</span>
              <Cabecalho titulo="Situação" explicacao={EXPLICACOES.situacao} />
              <Cabecalho titulo="Saldo" explicacao={EXPLICACOES.saldo} direita />
              <Cabecalho titulo="Consumo/mês" explicacao={EXPLICACOES.consumo} direita className="hidden @5xl:block" />
              <Cabecalho titulo="Cobertura" explicacao={EXPLICACOES.cobertura} direita />
              <Cabecalho titulo="Anunciar" explicacao={EXPLICACOES.anunciar} direita />
              <span aria-hidden="true" />
            </div>
            <ul className="divide-y divide-slate-100">
              {itens.slice(0, limite).map((item) => (
                <LinhaItem
                  key={item.chave}
                  item={item}
                  dias={analise.dias_periodo}
                  aberto={aberto === item.chave}
                  onAlternar={() => setAberto(aberto === item.chave ? null : item.chave)}
                />
              ))}
            </ul>
          </>
        )}

        {itens.length > limite && (
          <div className="px-6 py-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setLimite((l) => l + POR_PAGINA)}
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Mostrar mais ({itens.length - limite} restantes)
            </button>
          </div>
        )}
      </section>

      {/* Publicação das sugestões (depois da lista, para revisar os itens antes) */}
      {(pendentes.length > 0 || publicados > 0) && (
        <section className="bg-white border border-blue-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Megaphone size={20} className="text-blue-800" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                {pendentes.length > 0 ? `Publicar os ${pendentes.length} anúncio(s) sugeridos` : "Todas as sugestões foram publicadas"}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {pendentes.length > 0
                  ? <>Configure lote, datas, valor e descrição de uma vez, como no cadastro em massa.
                      {novosInsumos > 0 && <span className="text-amber-600 font-semibold"> {novosInsumos} material(is) ainda não são insumos cadastrados e serão cadastrados na publicação.</span>}</>
                  : "Os anúncios já estão no catálogo."}
                {publicados > 0 && <span className="text-emerald-700 font-semibold"> {publicados} já publicado(s).</span>}
              </p>
              {pendentes.length > 0 && (
                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
                  <Coins size={13} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Cada anúncio publicado usa <span className="font-semibold text-slate-700">{custoAnuncio}</span>, à parte da análise.
                    Publique só os que quiser agora: esta análise fica em <span className="font-semibold text-slate-700">Análises salvas</span> e
                    você volta quando quiser para publicar os demais.
                  </span>
                </p>
              )}
            </div>
          </div>
          {pendentes.length > 0 && (
            <button type="button" onClick={onConfigurar} className="h-11 px-6 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0">
              <Upload size={16} aria-hidden="true" /> Configurar e publicar
            </button>
          )}
        </section>
      )}
    </div>
  )
}

function AlertaCurto({ alerta, critico = false }: { alerta: AlertaEstoque; critico?: boolean }) {
  const Icone = critico ? AlertOctagon : Info
  return (
    <div
      role={critico ? "alert" : undefined}
      className={`rounded-2xl border px-4 py-2.5 flex items-start gap-2.5 text-sm ${
        critico ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-600"
      }`}
    >
      <Icone size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
      <p className="min-w-0">
        <span className={`font-bold ${critico ? "text-red-800" : "text-slate-800"}`}>{alerta.titulo}.</span>{" "}
        {critico
          ? <>Não podem ser anunciados; separe para descarte{alerta.detalhes.length > 0 && <>: <span className="text-red-800">{alerta.detalhes.join("; ")}</span></>}.</>
          : alerta.mensagem}
      </p>
    </div>
  )
}

function Indicador({ rotulo, valor, detalhe, cor = "text-slate-800", borda = "border-slate-100" }: {
  rotulo: string; valor: string; detalhe: string; cor?: string; borda?: string
}) {
  return (
    <div className={`bg-white border ${borda} rounded-2xl p-4 shadow-sm min-w-0`}>
      <p className="text-xs text-slate-500 font-medium mb-1">{rotulo}</p>
      <p className={`text-xl 2xl:text-2xl font-black tabular-nums leading-tight break-words ${cor}`}>{valor}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{detalhe}</p>
    </div>
  )
}

function Cabecalho({ titulo, explicacao, direita = false, className = "" }: {
  titulo: string; explicacao: string; direita?: boolean; className?: string
}) {
  return (
    <span className={className}>
      <span className={`flex ${direita ? "justify-end" : ""}`}>
        <RotuloExplicado titulo={titulo} explicacao={explicacao} className="inline-flex items-center gap-1 rounded uppercase hover:text-slate-800">
          {titulo} <Info size={11} className="text-slate-400" aria-hidden="true" />
        </RotuloExplicado>
      </span>
    </span>
  )
}

function LinhaItem({ item, dias, aberto, onAlternar }: { item: ItemAnaliseEstoque; dias: number; aberto: boolean; onAlternar: () => void }) {
  const un = unidade(item.unidade)
  const perfil = PERFIS[item.perfil] ?? PERFIS.sem_saldo
  const prioridade = PRIORIDADES[item.prioridade] ?? PRIORIDADES.nenhuma
  const idDetalhes = `item-${item.chave}`
  const sugerido = item.anunciar && !item.publicado
  const recorrente = !!(item.anterior?.anunciar && item.anunciar)
  const cobertura = item.cobertura_dias === null ? "Sem uso" : `${fmtNumero(item.cobertura_dias)} dias`

  return (
    <li className={`border-l-4 ${
      // Só a borda esquerda recebe cor: as divisórias entre linhas continuam cinza
      item.publicado ? "border-l-emerald-500" : sugerido ? "border-l-blue-600 bg-blue-50/30" : "border-l-transparent"
    }`}>
      {/* A linha inteira abre os detalhes; o botão redondo é o acesso pelo teclado */}
      <div
        onClick={onAlternar}
        className={`flex items-center gap-3 ${COLUNAS} px-4 @2xl:px-6 py-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors`}
      >
        {/* Em listas estreitas este bloco agrupa tudo; na tabela ele some e cada parte vira uma coluna */}
        <div className="flex-1 min-w-0 @2xl:contents">
          {/* Material */}
          <div className="min-w-0">
            <p className="text-[15px] leading-snug break-words">
              <span className={`font-semibold ${item.anunciar ? "text-slate-900" : "text-slate-600"}`}>{item.descricao}</span>
              {(item.codigo || item.unidade) && (
                <span className="ml-1.5 text-xs text-slate-400 whitespace-nowrap">
                  {item.codigo && <span className="tabular-nums">#{item.codigo}</span>}
                  {item.codigo && item.unidade && " · "}
                  {item.unidade}
                </span>
              )}
            </p>
            {recorrente && <p className="hidden @2xl:flex mt-1"><SeloRecorrente /></p>}
          </div>

          {/* Em listas estreitas: tudo em uma linha; na tabela: uma coluna para cada */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 @2xl:contents">
            <div className="flex items-center gap-2.5 @2xl:flex-col @2xl:items-start @2xl:gap-1.5">
              <RotuloExplicado titulo={perfil.rotulo} explicacao={perfil.explicacao}
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${perfil.classe}`}>
                {perfil.rotulo}
              </RotuloExplicado>
              <RotuloExplicado titulo={prioridade.rotulo} explicacao={prioridade.explicacao}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap rounded">
                <span className={`w-2 h-2 rounded-full ${prioridade.ponto}`} aria-hidden="true" />
                <span className="@2xl:hidden">{prioridade.curto}</span>
                <span className="hidden @2xl:inline">{prioridade.rotulo}</span>
              </RotuloExplicado>
            </div>
            <Valor rotulo="Saldo" valor={<>{fmtNumero(item.saldo)}{item.saldo_estimado && <span className="text-slate-400" title="Saldo estimado">*</span>}</>} />
            <Valor rotulo="Consumo/mês" valor={fmtNumero(item.consumo_mensal)} className="hidden @5xl:block" />
            <Valor rotulo="Cobertura" valor={cobertura} destaque={item.perfil === "estoque_baixo" ? "text-red-600" : undefined} />
            <div className="@2xl:text-right">
              {item.publicado ? (
                <RotuloExplicado titulo="Publicado" explicacao={EXPLICACOES.publicado}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle size={13} aria-hidden="true" /> Publicado
                </RotuloExplicado>
              ) : item.anunciar ? (
                <RotuloExplicado titulo="Sugerido para anunciar" explicacao={EXPLICACOES.sugerido}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-700 text-white tabular-nums">
                  <Megaphone size={13} aria-hidden="true" /> {fmtNumero(item.qtd_sugerida)}
                </RotuloExplicado>
              ) : (
                <span className="hidden @2xl:inline text-[15px] text-slate-300" aria-label="Sem sugestão">—</span>
              )}
            </div>
            {recorrente && <span className="@2xl:hidden"><SeloRecorrente /></span>}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAlternar() }}
          aria-expanded={aberto}
          aria-controls={idDetalhes}
          aria-label={`${aberto ? "Recolher" : "Ver detalhes de"} ${item.descricao}`}
          className={`w-9 h-9 shrink-0 @2xl:justify-self-end inline-flex items-center justify-center rounded-full border transition-colors cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
            aberto
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          <ChevronDown size={18} className={`transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {aberto && (
        <div id={idDetalhes} className="px-5 md:px-6 pb-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
          <div className={`rounded-xl border px-4 py-3 ${item.fonte_justificativa === "ia" ? "bg-blue-50/60 border-blue-100" : "bg-slate-50 border-slate-200"}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              {item.fonte_justificativa === "ia" ? <><Sparkles size={11} className="text-blue-700" aria-hidden="true" /> Análise da IA</> : "Análise estatística"}
            </p>
            <p className="text-sm text-slate-700 mt-1">{item.justificativa}</p>
            {item.fonte_justificativa === "ia" && item.qtd_sugerida !== item.qtd_sugerida_regra && (
              <p className="text-xs text-slate-500 mt-1">
                Pelo cálculo estatístico seriam {fmtNumero(item.qtd_sugerida_regra)} {un}; a IA ajustou para {fmtNumero(item.qtd_sugerida)} {un}.
              </p>
            )}
          </div>

          {item.sinais.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Sinais encontrados">
              {item.sinais.map((s) => {
                const sinal = SINAIS[s]
                return (
                  <li key={s}>
                    {sinal ? (
                      <RotuloExplicado titulo={sinal.rotulo} explicacao={sinal.explicacao}
                        className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium hover:bg-slate-200">
                        {sinal.rotulo}
                      </RotuloExplicado>
                    ) : <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">{s}</span>}
                  </li>
                )
              })}
            </ul>
          )}

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <Metrica rotulo={item.saldo_estimado ? "Saldo (estimado)" : "Saldo atual"} valor={`${fmtNumero(item.saldo)} ${un}`} />
            <Metrica rotulo={`Consumo em ${dias} dias`} valor={`${fmtNumero(item.consumo)} ${un}`} />
            <Metrica rotulo="Consumo médio/mês" valor={`${fmtNumero(item.consumo_mensal)} ${un}`} />
            <Metrica rotulo="Saídas para consumo" valor={fmtNumero(item.eventos_consumo)} />
            <Metrica rotulo="Dias sem consumo" valor={fmtNumero(item.dias_sem_consumo)} />
            <Metrica rotulo="Perda por vencimento" valor={item.perda_vencimento ? `${fmtNumero(item.perda_vencimento)} ${un}` : "—"} />
            <Metrica rotulo="Validade mais próxima" valor={fmtData(item.validade_proxima)} />
            <Metrica rotulo="Vence sem uso (previsão)" valor={item.qtd_risco_vencimento ? `${fmtNumero(item.qtd_risco_vencimento)} ${un}` : "—"} />
            {item.qtd_vencida > 0 && <Metrica rotulo="Já vencido" valor={`${fmtNumero(item.qtd_vencida)} ${un}`} destaque="text-red-600" />}
            {item.valor_unitario !== null && <Metrica rotulo="Valor unitário (planilha)" valor={fmtMoeda(item.valor_unitario)} />}
            {item.valor_excedente !== null && <Metrica rotulo="Valor parado (custo)" valor={fmtMoeda(item.valor_excedente)} destaque="text-emerald-700" />}
          </dl>

          {item.anterior && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <History size={13} aria-hidden="true" />
              Na análise de {fmtData(item.anterior.data)}: saldo de {fmtNumero(item.anterior.saldo)} {un}, {item.anterior.perfil_rotulo?.toLowerCase()}
              {item.anterior.anunciar ? `, sugerido anunciar ${fmtNumero(item.anterior.qtd_sugerida)} ${un}` : ""}.
            </p>
          )}

          {item.publicado ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-emerald-50/60 border border-emerald-100 px-4 py-3">
              <p className="text-sm text-slate-700">
                Anúncio publicado com <span className="font-bold tabular-nums">{fmtNumero(item.publicado.qtd_mat)} {un}</span>
                {item.publicado.data ? ` em ${fmtData(item.publicado.data)}` : ""}.
              </p>
              <Link href="/meus-anuncios" className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2 shrink-0">
                Ver meus anúncios
              </Link>
            </div>
          ) : item.anunciar && <AcaoAnunciar item={item} />}
        </div>
      )}
    </li>
  )
}

function Valor({ rotulo, valor, destaque, className = "" }: { rotulo: string; valor: React.ReactNode; destaque?: string; className?: string }) {
  return (
    <span className={`text-sm text-slate-500 whitespace-nowrap @2xl:text-right @2xl:text-[15px] ${className}`}>
      <span className="@2xl:sr-only">{rotulo} </span>
      <span className={`font-semibold @2xl:font-medium tabular-nums ${destaque ?? "text-slate-700"}`}>{valor}</span>
    </span>
  )
}

function SeloRecorrente() {
  return (
    <RotuloExplicado titulo="Sobra recorrente" explicacao={EXPLICACOES.recorrente}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200 text-xs font-semibold">
      <Repeat size={12} aria-hidden="true" /> Recorrente
    </RotuloExplicado>
  )
}

function Metrica({ rotulo, valor, destaque = "text-slate-900" }: { rotulo: string; valor: string; destaque?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums truncate ${destaque}`}>{valor}</dd>
    </div>
  )
}

function AcaoAnunciar({ item }: { item: ItemAnaliseEstoque }) {
  const un = unidade(item.unidade)
  if (item.cd_mat) {
    const params = new URLSearchParams({ mat: String(item.cd_mat), qtd: String(item.qtd_sugerida) })
    if (item.lote_sugerido) params.set("lote", item.lote_sugerido)
    if (item.validade_sugerida) params.set("validade", item.validade_sugerida)
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-blue-50/50 border border-blue-100 px-4 py-3">
        <p className="text-sm text-slate-700">
          Sugestão: anunciar <span className="font-bold text-blue-900 tabular-nums">{fmtNumero(item.qtd_sugerida)} {un}</span>
          {item.lote_sugerido ? <> do lote <span className="font-semibold">{item.lote_sugerido}</span></> : null}.
        </p>
        <Link href={`/anunciar?${params}`} className="h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors shrink-0">
          <Megaphone size={16} aria-hidden="true" /> Anunciar {fmtNumero(item.qtd_sugerida)} {un}
        </Link>
      </div>
    )
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
      <p className="text-sm text-slate-700">
        Sugestão: anunciar <span className="font-bold text-slate-900 tabular-nums">{fmtNumero(item.qtd_sugerida)} {un}</span>.
        Este material ainda não é um insumo cadastrado: use <span className="font-semibold">Configurar e publicar</span> para
        cadastrá-lo junto com o anúncio, ou cadastre só o insumo agora.
      </p>
      <Link href={`/cadastrar/insumo?${new URLSearchParams({ nome: item.descricao })}`} className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors shrink-0">
        <PackagePlus size={16} aria-hidden="true" /> Cadastrar insumo
      </Link>
    </div>
  )
}
