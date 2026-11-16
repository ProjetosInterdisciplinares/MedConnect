"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { LayoutDashboard } from "lucide-react"
import { NegociacaoTab } from "@/components/caixa-de-propostas/em-negociacao"
import { HistoricoFinalizadosTab } from "@/components/caixa-de-propostas/historico-finalizados"
import SecaoTabs from "@/components/layout/SecaoTabs"


const CABECALHO = {
  negociacao: {
    titulo: "Propostas Recebidas",
    descricao: "Acompanhe e responda às ofertas feitas nos seus anúncios ativos.",
  },
  finalizados: {
    titulo: "Vendas",
    descricao: "Propostas que você aceitou: fale com o comprador pelo WhatsApp e confirme a entrega para concluir.",
  },
} as const

function CaixaDePropostasContent() {
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("tab") ?? "negociacao"
  )

  useEffect(() => {
    // Sem ?tab= volta para a aba padrão (propostas recebidas)
    setActiveTab(searchParams.get("tab") === "finalizados" ? "finalizados" : "negociacao")
  }, [searchParams])

  const cabecalho = CABECALHO[activeTab === "finalizados" ? "finalizados" : "negociacao"]

  return (
    <div className="relative w-full antialiased">

      <div className="w-full font-sans relative z-10">
        <SecaoTabs secao="negociacoes" />

        {/* Header da Página */}
        <div className="mb-6">
          <h1 className="sr-only">{cabecalho.titulo}</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {cabecalho.descricao}
          </p>
        </div>

        {/* Área de Conteúdo */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          {activeTab === "negociacao" && <NegociacaoTab />}
          {activeTab === "finalizados" && <HistoricoFinalizadosTab />}
        </div>
      </div>
    </div>
  )
}

export default function CaixaDePropostasPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] w-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" /></div>}>
      <CaixaDePropostasContent />
    </Suspense>
  )
}