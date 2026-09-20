"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Handshake, History } from "lucide-react"
import { NegociacaoTab } from "@/components/caixa-de-propostas/em-negociacao"
import { PropostasTab } from "@/components/caixa-de-propostas/minhas-propostas"
import AnimatedBackground from "@/components/ui/animated-background"

const TABS = [
  {
    id: "negociacao",
    label: "Recebidas / Em Negociação",
    icon: Handshake,
  },
  {
    id: "compras",
    label: "Minhas Propostas Enviadas",
    icon: History,
  },
]

export default function CaixaDePropostasPage() {
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("tab") ?? "negociacao"
  )

  useEffect(() => {
    const tab = searchParams.get("tab")

    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  return (
    <div className="relative min-h-screen w-full antialiased selection:bg-teal-500/20">
      <AnimatedBackground />
      <div className="max-w-5xl mx-auto py-10 px-4 md:px-0 font-sans relative z-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-400 flex items-center gap-2">
          Caixa de Propostas
        </h1>

        <p className="text-zinc-500 text-sm mt-1">
          Acompanhe os pedidos recebidos em seus anúncios e as propostas
          enviadas para terceiros.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit mb-8">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`hover:cursor-pointer flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? "bg-teal-700 text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-teal-700 dark:hover:text-teal-400"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo das abas */}
      <div className="mt-6">
        {activeTab === "negociacao" && <NegociacaoTab />}
        {activeTab === "compras" && <PropostasTab />}
      </div>
      </div>
    </div>
  )
}