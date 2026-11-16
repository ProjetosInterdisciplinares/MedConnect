"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { SaldoCreditos, TransacaoCredito } from "@/types"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import servicesGetCreditosExtrato from "@/server/(GET)-creditos-extrato"
import ExtratoItem from "@/components/creditos/ExtratoItem"
import { formatCreditos, onCreditosAtualizados } from "@/lib/creditos"
import { rotuloCreditos, useCustosCreditos } from "@/hooks/useCustosCreditos"

/**
 * Créditos na página de perfil: cartão de saldo + últimas movimentações.
 *
 * `emGrade`: os dois blocos viram itens da grade do pai (display: contents);
 * o saldo ocupa 1 coluna e as movimentações a largura toda.
 */
export default function CarteiraCreditos({ emGrade = false }: { emGrade?: boolean }) {
  const custos = useCustosCreditos()
  const [saldo, setSaldo] = useState<SaldoCreditos | null>(null)
  const [ultimas, setUltimas] = useState<TransacaoCredito[]>([])
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    const [s, e] = await Promise.all([servicesGetCreditosSaldo(), servicesGetCreditosExtrato({ limite: 4 })])
    if (!("isError" in s)) setSaldo(s)
    if (Array.isArray(e)) setUltimas(e)
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
    return onCreditosAtualizados(() => carregar())
  }, [])

  return (
    <section
      id="perfil-carteira-creditos"
      className={emGrade ? "contents" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}
      aria-labelledby="carteira-titulo"
    >
      {/* Saldo */}
      <div className={`${emGrade ? "xl:col-span-1" : ""} bg-white border border-slate-200 rounded-xl p-5 flex flex-col`}>
        <h2 id="carteira-titulo" className="text-base font-semibold text-slate-900">Créditos</h2>

        <p className="mt-4 text-sm text-slate-500">Saldo disponível</p>
        <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
          {carregando ? <span className="inline-block w-16 h-8 rounded bg-slate-100 animate-pulse align-middle" /> : formatCreditos(saldo?.saldo)}
          {!carregando && <span className="ml-1.5 text-sm font-normal text-slate-500">créditos</span>}
        </p>

        {(saldo?.saldo ?? 0) > 0 && <dl className="mt-5 grid grid-cols-2 divide-x divide-slate-100 border-y border-slate-100 py-3 text-sm">
          <div className="pr-3">
            <dt className="text-xs text-slate-500">Recebidos</dt>
            <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">{formatCreditos(saldo?.total_adquirido)}</dd>
          </div>
          <div className="pl-3">
            <dt className="text-xs text-slate-500">Utilizados</dt>
            <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums">{formatCreditos(saldo?.total_consumido)}</dd>
          </div>
        </dl>}

        <div className="mt-auto pt-5 flex flex-col gap-2">
          <Link
            href="/creditos"
            id="perfil-comprar-creditos"
            className="h-10 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center justify-center transition-colors"
          >
            Comprar créditos
          </Link>
          <p className="text-xs text-slate-500 text-center">
            Publicar anúncio: {rotuloCreditos(custos.publicacao)} · Descrição com IA: {rotuloCreditos(custos.ia)}
          </p>
        </div>
      </div>

      {/* Últimas movimentações */}
      <div className={`${emGrade ? "xl:col-span-3" : "lg:col-span-2"} bg-white border border-slate-200 rounded-xl p-5 flex flex-col`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-slate-900">Últimas movimentações de créditos</h2>
          <Link href="/creditos#extrato" className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
            Ver extrato <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {carregando ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-100 animate-pulse" />)}
          </div>
        ) : ultimas.length === 0 ? (
          <p className="py-6 text-sm text-slate-500">
            Nenhuma movimentação ainda. Compras e usos de créditos aparecem aqui.
          </p>
        ) : (
          <ul className="-mx-3 divide-y divide-slate-100">
            {ultimas.map((t, i) => <ExtratoItem key={t.id} transacao={t} compact index={i} />)}
          </ul>
        )}
      </div>
    </section>
  )
}
