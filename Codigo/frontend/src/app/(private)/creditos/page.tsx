"use client"

import React, { useEffect, useMemo, useState } from "react"

import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import servicesGetCreditosPacotes from "@/server/(GET)-creditos-pacotes"
import servicesGetCreditosExtrato from "@/server/(GET)-creditos-extrato"
import { formatBRL, formatCreditos, formatDataHora, notificarCreditosAtualizados } from "@/lib/creditos"
import { ComprarCreditosResponse, SaldoCreditos, PacoteCredito, TransacaoCredito } from "@/types"

import PacoteCard from "@/components/creditos/PacoteCard"
import { ICONE_TIPO } from "@/components/creditos/ExtratoItem"
import CheckoutDialog from "@/components/creditos/CheckoutDialog"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"

const FILTROS = [
  { id: "todas", rotulo: "Todas" },
  { id: "entradas", rotulo: "Entradas" },
  { id: "saidas", rotulo: "Saídas" },
] as const
type Filtro = (typeof FILTROS)[number]["id"]

const CARTAO = "bg-white border border-slate-200 rounded-xl"

function formatarData(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR")
}

export default function CreditosPage() {
  const custos = useCustosCreditos()
  const publicacoesCom = (creditos: number) => (custos.publicacao ? Math.floor(creditos / custos.publicacao) : null)
  const [saldo, setSaldo] = useState<SaldoCreditos | null>(null)
  const [pacotes, setPacotes] = useState<PacoteCredito[]>([])
  const [extrato, setExtrato] = useState<TransacaoCredito[]>([])
  const [carregando, setCarregando] = useState(true)

  const [escolhido, setEscolhido] = useState<PacoteCredito | null>(null) // seleção na lista
  const [checkout, setCheckout] = useState<PacoteCredito | null>(null) // diálogo aberto
  const [filtro, setFiltro] = useState<Filtro>("todas")

  async function carregarDados() {
    setCarregando(true)
    const [saldoRes, pacotesRes, extratoRes] = await Promise.all([
      servicesGetCreditosSaldo(),
      servicesGetCreditosPacotes(),
      servicesGetCreditosExtrato(),
    ])
    if (!("isError" in saldoRes)) setSaldo(saldoRes)
    if (Array.isArray(pacotesRes)) {
      setPacotes(pacotesRes)
      // Pré-seleciona o pacote marcado no Django Admin; senão, o primeiro
      setEscolhido(pacotesRes.find((p) => p.destaque) ?? pacotesRes[0] ?? null)
    }
    if (Array.isArray(extratoRes)) setExtrato(extratoRes)
    setCarregando(false)
  }

  useEffect(() => { carregarDados() }, [])

  function handleCompraSuccess(resultado: ComprarCreditosResponse) {
    setSaldo((prev) => prev ? { ...prev, saldo: resultado.saldo, total_adquirido: prev.total_adquirido + resultado.transacao.quantidade } : null)
    setExtrato((prev) => [resultado.transacao, ...prev])
    notificarCreditosAtualizados(resultado.saldo)
  }

  // Economia por crédito em relação ao pacote mais barato
  const precoBasePorCredito = useMemo(() => {
    const base = [...pacotes].sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco))[0]
    return base ? parseFloat(base.preco) / base.total_creditos : 0
  }, [pacotes])

  const extratoFiltrado = useMemo(
    () => extrato.filter((t) => filtro === "todas" || (filtro === "entradas" ? t.is_entrada : !t.is_entrada)),
    [extrato, filtro],
  )

  // Créditos de boas-vindas ainda válidos (para avisar o prazo)
  const proximaExpiracao = useMemo(() => {
    const agora = Date.now()
    const datas = extrato
      .filter((t) => t.is_entrada && t.expira_em && new Date(t.expira_em).getTime() > agora)
      .map((t) => t.expira_em as string)
      .sort()
    return datas[0] ?? null
  }, [extrato])

  const saldoAtual = saldo?.saldo ?? 0

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="sr-only">Créditos</h1>
        <p className="text-sm text-slate-500">
          Compre créditos sob demanda, sem mensalidade, e acompanhe o uso da sua instituição.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
        {/* ─── Saldo ─── */}
        <aside className="flex flex-col gap-6">
          <section className={`${CARTAO} p-5`} aria-labelledby="saldo-titulo">
            <h2 id="saldo-titulo" className="text-sm text-slate-500">Saldo disponível</h2>
            <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
              {carregando ? <span className="inline-block w-16 h-8 rounded bg-slate-100 animate-pulse align-middle" /> : formatCreditos(saldoAtual)}
              {!carregando && <span className="ml-1.5 text-sm font-normal text-slate-500">créditos</span>}
            </p>
            {!carregando && saldoAtual > 0 && publicacoesCom(saldoAtual) !== null && (
              <p className="mt-1 text-sm text-slate-600 tabular-nums">
                Suficiente para {formatCreditos(publicacoesCom(saldoAtual))}{" "}
                {publicacoesCom(saldoAtual) === 1 ? "publicação" : "publicações"}
              </p>
            )}
            {saldoAtual > 0 && proximaExpiracao && (
              <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Créditos promocionais válidos até {formatarData(proximaExpiracao)}.
              </p>
            )}

            {saldoAtual > 0 && <dl className="mt-5 grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4 text-sm">
              <div className="pr-3">
                <dt className="text-xs text-slate-500">Recebidos</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">{formatCreditos(saldo?.total_adquirido)}</dd>
              </div>
              <div className="pl-3">
                <dt className="text-xs text-slate-500">Utilizados</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">{formatCreditos(saldo?.total_consumido)}</dd>
              </div>
            </dl>}
          </section>

          <section className={`${CARTAO} p-5`} aria-labelledby="custos-titulo">
            <h2 id="custos-titulo" className="text-base font-semibold text-slate-900">Quanto custa cada ação</h2>
            <dl className="mt-3 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-slate-600">Publicar um anúncio</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{rotuloCreditos(custos.publicacao)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-slate-600">Gerar descrição com IA</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{rotuloCreditos(custos.ia)}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-slate-600">Buscar, negociar e enviar propostas</dt>
                <dd className="font-medium text-slate-900 whitespace-nowrap">Sem custo</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500">O custo aparece antes de cada ação, para você confirmar.</p>
          </section>
        </aside>

        {/* ─── Comprar ─── */}
        <section className={`${CARTAO} p-5`} aria-labelledby="pacotes-titulo">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="pacotes-titulo" className="text-base font-semibold text-slate-900">Comprar créditos</h2>
            <p className="text-xs text-slate-500">Pagamento único, sem mensalidade</p>
          </div>

          {carregando ? (
            <div className="mt-4 space-y-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[68px] rounded-lg bg-slate-100 animate-pulse" />)}
            </div>
          ) : pacotes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nenhum pacote disponível no momento.</p>
          ) : (
            <>
              <div role="radiogroup" aria-labelledby="pacotes-titulo" className="mt-4 grid gap-2">
                {pacotes.map((pacote) => {
                  const porCredito = parseFloat(pacote.preco) / pacote.total_creditos
                  const economia = precoBasePorCredito > 0 ? Math.round((1 - porCredito / precoBasePorCredito) * 100) : 0
                  return (
                    <PacoteCard
                      key={pacote.id}
                      pacote={pacote}
                      economia={economia}
                      publicacoes={publicacoesCom(pacote.total_creditos)}
                      selecionado={escolhido?.id === pacote.id}
                      onSelecionar={setEscolhido}
                    />
                  )
                })}
              </div>

              {escolhido && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-slate-600 tabular-nums">
                    <span className="font-semibold text-slate-900">{escolhido.nome}</span> · {formatCreditos(escolhido.total_creditos)} créditos ·{" "}
                    saldo após a compra: <span className="font-semibold text-slate-900">{formatCreditos(saldoAtual + escolhido.total_creditos)}</span>
                  </p>
                  <button
                    type="button"
                    id={`comprar-pacote-${escolhido.id}`}
                    onClick={() => setCheckout(escolhido)}
                    className="h-10 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white transition-colors shrink-0 cursor-pointer"
                  >
                    Comprar por {formatBRL(escolhido.preco)}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ─── Extrato ─── */}
      <section id="extrato" className={`${CARTAO} mt-6 scroll-mt-6`} aria-labelledby="extrato-titulo">
        <header className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <div>
            <h2 id="extrato-titulo" className="text-base font-semibold text-slate-900">Extrato</h2>
            <p className="mt-0.5 text-xs text-slate-500">Compras, bônus e usos de créditos da instituição.</p>
          </div>
          <div role="tablist" aria-label="Filtrar movimentações" className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={`h-8 px-3 rounded-md text-sm font-medium transition-colors ${filtro === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </header>

        {carregando ? (
          <div className="px-5 pb-5 space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-11 rounded-lg bg-slate-100 animate-pulse" />)}
          </div>
        ) : extratoFiltrado.length === 0 ? (
          <p className="px-5 pb-6 pt-1 text-sm text-slate-500">
            {extrato.length === 0 ? "Nenhuma movimentação ainda. Compras e usos de créditos aparecem aqui." : "Nenhuma movimentação neste filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                  <th scope="col" className="px-5 py-2.5 font-medium whitespace-nowrap hidden sm:table-cell">Data</th>
                  <th scope="col" className="pl-5 sm:pl-3 pr-3 py-2.5 font-medium">Movimentação</th>
                  <th scope="col" className="px-3 py-2.5 font-medium text-right">Créditos</th>
                  <th scope="col" className="px-5 py-2.5 font-medium text-right hidden sm:table-cell">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extratoFiltrado.map((t) => {
                  const Icon = ICONE_TIPO[t.tipo]
                  const detalhes = [
                    t.tipo_display,
                    t.metodo_pagamento_display,
                    t.valor_pago ? formatBRL(t.valor_pago) : null,
                    t.expira_em ? `válido até ${formatarData(t.expira_em)}` : null,
                  ].filter(Boolean).join(" · ")
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-slate-600 tabular-nums whitespace-nowrap align-top hidden sm:table-cell">{formatDataHora(t.data_transacao)}</td>
                      <td className="pl-5 sm:pl-3 pr-3 py-3 align-top">
                        <div className="flex items-start gap-2.5">
                          <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{t.descricao}</p>
                            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                              <span className="sm:hidden">{formatDataHora(t.data_transacao)} · </span>
                              {detalhes}
                              {t.status !== "A" && (
                                <span className={t.status === "P" ? "text-amber-700" : "text-red-700"}> · {t.status_display}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap align-top ${t.is_entrada ? "text-emerald-700" : "text-slate-900"}`}>
                        {t.is_entrada ? "+" : "−"}{formatCreditos(t.quantidade)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600 tabular-nums hidden sm:table-cell align-top">{formatCreditos(t.saldo_apos)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CheckoutDialog
        pacote={checkout}
        saldoAtual={saldoAtual}
        onClose={() => setCheckout(null)}
        onSuccess={handleCompraSuccess}
      />
    </div>
  )
}
