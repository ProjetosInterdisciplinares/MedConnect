"use client"

import React, { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts"
import { StatisticsResponse } from "@/types"
import servicesGetStatistics from "@/server/(GET)-statistics"
import { IndicadoresPrincipais, RankingsControle, AdesaoControle } from "@/components/admin/PainelControle"

/* Paleta dos gráficos (validada: blue-700 + sky-500, sempre com legenda e tooltip) */
const COR_1 = "#1d4ed8"
const COR_2 = "#0ea5e9"
const EIXO = { fill: "#64748b", fontSize: 12 }
const TOOLTIP = {
  contentStyle: { borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px -6px rgba(15,23,42,.15)", fontSize: 13, padding: "8px 12px" },
  labelStyle: { color: "#0f172a", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#334155", padding: 0 },
}

const fmt = (n: number) => n.toLocaleString("pt-BR")
const moeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const PERIODOS = [
  { id: "diario", label: "Dias" },
  { id: "semanal", label: "Semanas" },
  { id: "mensal", label: "Meses" },
  { id: "anual", label: "Anos" },
] as const
type Periodo = (typeof PERIODOS)[number]["id"]

function Cartao({ titulo, descricao, acao, children, className = "" }: {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 p-5 flex flex-col min-w-0 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>}
        </div>
        {acao}
      </header>
      {children}
    </section>
  )
}

/** Mensagem sobre o gráfico quando não há valores no período. */
function SemDados({ ativo, texto }: { ativo: boolean; texto: string }) {
  if (!ativo) return null
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
      <p className="rounded-md bg-white px-3 py-1.5 text-center text-sm text-slate-500">{texto}</p>
    </div>
  )
}

function LinhaValor({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums tracking-tight">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
  )
}

export default function DashboardsPage() {
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>("mensal")

  async function carregar() {
    setLoading(true)
    try {
      const response = await servicesGetStatistics()
      if (response && !("isError" in response)) setStats(response as StatisticsResponse)
    } catch (err) {
      console.error("Erro ao carregar estatísticas", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (loading && !stats) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw size={16} className="animate-spin" /> Carregando indicadores…
        </p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-slate-900">Não foi possível carregar os indicadores</h2>
          <p className="mt-1 text-sm text-slate-500">Verifique a conexão com o servidor e tente novamente.</p>
          <button
            type="button"
            onClick={carregar}
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold"
          >
            <RefreshCw size={15} /> Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const distribuicao = [
    { nome: "Ativos", valor: stats.anuncios_ativos || 0 },
    { nome: "Em negociação", valor: stats.anuncios_negociacao || 0 },
    { nome: "Repassados", valor: stats.anuncios_finalizados || 0 },
    { nome: "Expirados ou inativos", valor: stats.anuncios_inativos || 0 },
  ]
  const totalAnuncios = distribuicao.reduce((s, d) => s + d.valor, 0)
  const maiorFatia = Math.max(1, ...distribuicao.map((d) => d.valor))
  const conversao = totalAnuncios > 0
    ? ((stats.anuncios_finalizados || 0) / totalAnuncios * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    : "0"

  return (
    <div className="w-full">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="sr-only">Controle</h1>
          <p className="text-sm text-slate-500">
            Clientes, propostas, anúncios e créditos, calculados a partir dos dados registrados.
          </p>
        </div>
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" /> Atualizar
        </button>
      </div>

      <div className="space-y-6">
        {stats.controle && <IndicadoresPrincipais dados={stats.controle} />}

        {/* Evolução + financeiro */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Cartao
            titulo="Evolução mensal"
            descricao="Anúncios publicados e propostas enviadas nos últimos 6 meses"
            className="xl:col-span-2"
            acao={
              <ul className="flex items-center gap-4 text-xs text-slate-600" aria-label="Legenda">
                <li className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_1 }} aria-hidden="true" />Anúncios</li>
                <li className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_2 }} aria-hidden="true" />Propostas</li>
              </ul>
            }
          >
            <div className="relative h-[300px] -ml-2">
              <SemDados
                ativo={!(stats.historico || []).some((m) => (m.anuncios || 0) + (m.propostas || 0) > 0)}
                texto="Nenhum anúncio ou proposta nos últimos 6 meses."
              />
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.historico || []} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#eef2f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={EIXO} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={EIXO} allowDecimals={false} width={36} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} {...TOOLTIP} />
                  <Bar name="Anúncios" dataKey="anuncios" fill={COR_1} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar name="Propostas" dataKey="propostas" fill={COR_2} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Cartao>

          <Cartao titulo="Receita da plataforma" descricao="Totais acumulados">
            <div className="divide-y divide-slate-100">
              <LinhaValor label="Venda de créditos" valor={moeda(stats.receita_creditos || 0)} detalhe="Pacotes de créditos comprados pelas instituições" />
              <LinhaValor label="Créditos utilizados" valor={fmt(stats.creditos_consumidos || 0)} detalhe="Publicações de anúncios e descrições com IA" />
            </div>
            <p className="mt-auto pt-4 text-xs text-slate-500 leading-relaxed">
              O MedConnect não intermedia preço, pagamento ou entrega entre as instituições. Por isso, os valores negociados não entram nestes totais.
            </p>
          </Cartao>
        </div>

        {/* Distribuição + receita */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Cartao titulo="Anúncios por situação" descricao={`${fmt(totalAnuncios)} anúncios criados`}>
            <ul className="space-y-4">
              {distribuicao.map((d) => (
                <li key={d.nome}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-600">{d.nome}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {fmt(d.valor)}
                      <span className="ml-1.5 text-xs font-normal text-slate-500">
                        {totalAnuncios ? Math.round(d.valor / totalAnuncios * 100) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-700" style={{ width: `${(d.valor / maiorFatia) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-5 text-xs text-slate-500">
              Taxa de conversão (repassados ÷ criados): <span className="font-semibold text-slate-700 tabular-nums">{conversao}%</span>
            </p>
          </Cartao>

          <Cartao
            titulo="Receita com créditos"
            descricao="Valor das compras de pacotes no período"
            className="xl:col-span-2"
            acao={
              <div role="tablist" aria-label="Período" className="flex items-center rounded-lg bg-slate-100 p-0.5">
                {PERIODOS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={periodo === p.id}
                    onClick={() => setPeriodo(p.id)}
                    className={`px-3 h-7 text-xs font-semibold rounded-md transition-colors ${periodo === p.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="relative h-[260px] -ml-2">
              <SemDados
                ativo={!(stats.historico_rendas?.[periodo] || []).some((r) => (r.valor || 0) > 0)}
                texto="Nenhuma compra de créditos no período."
              />
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.historico_rendas?.[periodo] || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COR_1} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={COR_1} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#eef2f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={EIXO} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={EIXO} width={56} tickFormatter={(v) => `R$ ${fmt(Number(v))}`} />
                  <Tooltip
                    formatter={(v) => [moeda(Number(v) || 0), "Receita"]}
                    cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
                    {...TOOLTIP}
                  />
                  <Area type="monotone" dataKey="valor" stroke={COR_1} strokeWidth={2} fill="url(#gradReceita)"
                    activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Cartao>
        </div>

        {stats.controle && <RankingsControle dados={stats.controle} />}

        {stats.controle && (
          <AdesaoControle
            dados={stats.controle}
            empresas={stats.total_pessoas_juridicas || 0}
            materiais={stats.total_matmeds || 0}
          />
        )}
      </div>
    </div>
  )
}
