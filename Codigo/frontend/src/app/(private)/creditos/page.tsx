"use client"

import React, { useEffect, useState } from "react"
import { ArrowLeft, Sparkles, History, Wallet } from "lucide-react"
import Link from "next/link"

import servicesGetCreditosSaldo from "@/server/(GET)-creditos-saldo"
import servicesGetCreditosPacotes from "@/server/(GET)-creditos-pacotes"
import servicesGetCreditosExtrato from "@/server/(GET)-creditos-extrato"
import { notificarCreditosAtualizados } from "@/lib/creditos"

import { SaldoCreditos, PacoteCredito, TransacaoCredito } from "@/types"

import AnimatedBackground from "@/components/ui/animated-background"
import CreditoCoin from "@/components/creditos/CreditoCoin"
import PacoteCard from "@/components/creditos/PacoteCard"
import ExtratoItem from "@/components/creditos/ExtratoItem"
import CheckoutDialog from "@/components/creditos/CheckoutDialog"
import { formatCreditos } from "@/lib/creditos"

export default function CreditosPage() {
  const [saldo, setSaldo] = useState<SaldoCreditos | null>(null)
  const [pacotes, setPacotes] = useState<PacoteCredito[]>([])
  const [extrato, setExtrato] = useState<TransacaoCredito[]>([])
  
  const [carregando, setCarregando] = useState(true)
  
  const [pacoteSelecionado, setPacoteSelecionado] = useState<PacoteCredito | null>(null)

  async function carregarDados() {
    setCarregando(true)
    const [saldoRes, pacotesRes, extratoRes] = await Promise.all([
      servicesGetCreditosSaldo(),
      servicesGetCreditosPacotes(),
      servicesGetCreditosExtrato()
    ])

    if (!("isError" in saldoRes)) setSaldo(saldoRes)
    if (Array.isArray(pacotesRes)) setPacotes(pacotesRes)
    if (Array.isArray(extratoRes)) setExtrato(extratoRes)
      
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function handleCompraSuccess(resultado: any) {
    // Atualiza saldo atual local
    setSaldo(prev => prev ? { 
      ...prev, 
      saldo: resultado.saldo, 
      total_adquirido: prev.total_adquirido + resultado.transacao.quantidade 
    } : null)
    
    // Adiciona a transação ao topo do extrato
    setExtrato(prev => [resultado.transacao, ...prev])
    
    // Notifica outros componentes (header)
    notificarCreditosAtualizados(resultado.saldo)
  }

  // Acha o pacote mais básico para calcular o % de economia
  const pacoteBasico = pacotes.length > 0 ? [...pacotes].sort((a, b) => parseFloat(a.preco) - parseFloat(b.preco))[0] : null
  const precoBasePorCredito = pacoteBasico ? parseFloat(pacoteBasico.preco) / pacoteBasico.total_creditos : 0

  return (
    <div className="relative min-h-screen w-full antialiased">
      <AnimatedBackground />
      
      <div className="max-w-6xl mx-auto py-8 px-4 relative z-10 space-y-12">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link 
              href="/perfil" 
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4"
            >
              <ArrowLeft size={16} /> Voltar ao perfil
            </Link>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-amber-300 shadow-sm" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}>
                <Sparkles className="text-white" size={24} strokeWidth={2.5} />
              </div>
              Central de Créditos
            </h1>
            <p className="text-slate-500 mt-2 max-w-2xl text-sm font-medium">
              Adquira créditos para turbinar seus anúncios, gerar descrições com inteligência artificial e destacar seus materiais na plataforma.
            </p>
          </div>
          
          <div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
            <CreditoCoin size={48} className="drop-shadow-md" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Seu saldo atual</p>
              <p className="text-3xl font-black text-slate-900 tabular-nums leading-none mt-1">
                {carregando ? (
                  <span className="inline-block w-16 h-8 bg-slate-100 rounded-lg animate-pulse" />
                ) : (
                  formatCreditos(saldo?.saldo)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Loja / Pacotes */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Wallet size={24} className="text-blue-700" />
            <h2 className="text-xl font-bold text-slate-800">Escolha o melhor pacote</h2>
          </div>
          
          {carregando ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-slate-100 rounded-[28px] animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pacotes.map((pacote, index) => {
                const precoPorCredito = parseFloat(pacote.preco) / pacote.total_creditos
                const economia = precoBasePorCredito > 0 ? Math.round((1 - (precoPorCredito / precoBasePorCredito)) * 100) : 0
                return (
                  <PacoteCard 
                    key={pacote.id} 
                    pacote={pacote} 
                    economia={economia} 
                    index={index} 
                    onComprar={setPacoteSelecionado} 
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* Extrato Histórico */}
        <section id="extrato" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <History size={24} className="text-blue-700" />
            <h2 className="text-xl font-bold text-slate-800">Extrato de movimentações</h2>
          </div>
          
          {carregando ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : extrato.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="text-slate-300" size={32} />
              </div>
              <p className="font-bold text-slate-700">Nenhuma movimentação</p>
              <p className="text-sm text-slate-400 mt-1">O seu histórico de compras e usos de crédito aparecerá aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {extrato.map((transacao, i) => (
                <ExtratoItem key={transacao.id} transacao={transacao} index={i} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <CheckoutDialog 
        pacote={pacoteSelecionado}
        saldoAtual={saldo?.saldo ?? 0}
        onClose={() => setPacoteSelecionado(null)}
        onSuccess={handleCompraSuccess}
      />
    </div>
  )
}
