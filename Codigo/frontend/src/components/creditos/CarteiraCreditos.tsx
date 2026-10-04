"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, History, Sparkles, Wallet } from "lucide-react"
import { SaldoCreditos, TransacaoCredito } from "@/types"
import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import servicesGetCreditosExtrato from "@/server/(GET)-creditos-extrato"
import CreditoCoin from "@/components/creditos/CreditoCoin"
import ExtratoItem from "@/components/creditos/ExtratoItem"
import { formatCreditos, onCreditosAtualizados } from "@/lib/creditos"

/**
 * Card "Carteira de Créditos" exibido na página de perfil.
 */
export default function CarteiraCreditos() {
  const [saldo, setSaldo] = useState<SaldoCreditos | null>(null)
  const [ultimas, setUltimas] = useState<TransacaoCredito[]>([])
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    const [s, e] = await Promise.all([
      servicesGetCreditosSaldo(),
      servicesGetCreditosExtrato({ limite: 4 }),
    ])
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
      className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8"
      aria-labelledby="carteira-titulo"
    >
      {/* Cartão de saldo */}
      <div className="lg:col-span-2 relative overflow-hidden rounded-3xl p-7 bg-white border border-slate-200 shadow-sm">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-500" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-amber-200/10 blur-3xl" />
        <CreditoCoin size={120} className="absolute -right-6 -bottom-6 opacity-[0.08] animate-credit-float grayscale" />

        <div className="relative">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-[0.16em]">
            <Wallet size={14} className="text-amber-500" /> Carteira de Créditos
          </div>

          <div className="mt-5 flex items-center gap-3">
            <CreditoCoin size={44} className="drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
            <div>
              <p id="carteira-titulo" className="text-4xl font-black tabular-nums tracking-tight leading-none text-slate-800">
                {carregando ? (
                  <span className="inline-block w-20 h-9 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  formatCreditos(saldo?.saldo)
                )}
              </p>
              <p className="text-sm text-slate-500 font-medium mt-1">créditos disponíveis</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Adquiridos</p>
              <p className="text-lg font-extrabold tabular-nums text-emerald-600">+{formatCreditos(saldo?.total_adquirido)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Utilizados</p>
              <p className="text-lg font-extrabold tabular-nums text-rose-600">−{formatCreditos(saldo?.total_consumido)}</p>
            </div>
          </div>

          <Link
            href="/creditos"
            id="perfil-comprar-creditos"
            className="credit-shine mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-extrabold text-blue-950 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24 50%, #f59e0b)", boxShadow: "0 4px 14px rgba(251,191,36,0.25)" }}
          >
            <Sparkles size={16} /> Comprar créditos
          </Link>
        </div>
      </div>

      {/* Últimas movimentações */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-blue-700" /> Últimas movimentações
          </h2>
          <Link
            href="/creditos#extrato"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 group"
          >
            Ver extrato completo
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {carregando ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : ultimas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <CreditoCoin size={48} className="opacity-60 mb-3" />
            <p className="text-sm font-bold text-slate-700">Nenhuma movimentação ainda</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Adquira créditos para desbloquear as funcionalidades premium da plataforma.
            </p>
          </div>
        ) : (
          <ul className="-mx-1 divide-y divide-slate-100">
            {ultimas.map((t, i) => (
              <ExtratoItem key={t.id} transacao={t} compact index={i} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
