"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Handshake, History, Inbox, SendHorizontal, LayoutDashboard } from "lucide-react"
import { NegociacaoTab } from "@/components/caixa-de-propostas/em-negociacao"
import { PropostasTab } from "@/components/caixa-de-propostas/minhas-propostas"
import AnimatedBackground from "@/components/ui/animated-background"

const TABS = [
  {
    id: "negociacao",
    label: "Recebidas",
    description: "Propostas aguardando sua análise",
    icon: Inbox,
  },
  {
    id: "compras",
    label: "Enviadas",
    description: "Histórico das propostas que você enviou",
    icon: SendHorizontal,
  },
]

function CaixaDePropostasContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("tab") ?? "negociacao"
  )

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    router.push(`?tab=${id}`, { scroll: false })
  }

  return (
    <div className="relative min-h-screen w-full antialiased bg-slate-50/50 selection:bg-blue-500/20">
      <AnimatedBackground />
      <div className="max-w-[1200px] mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8 font-sans relative z-10">
        
        {/* Header da Página */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Caixa de Propostas
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl ml-[52px]">
            Gerencie todas as suas negociações em um só lugar. Acompanhe as propostas recebidas nos seus anúncios e o status das propostas que você enviou.
          </p>
        </div>

        {/* Layout Master-Detail / Sidebar */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Navegação Lateral */}
          <aside className="w-full md:w-72 shrink-0 flex flex-col gap-2">
            {TABS.map(({ id, label, description, icon: Icon }) => {
              const isActive = activeTab === id
              
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTabChange(id)}
                  className={`relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? "bg-white shadow-sm ring-1 ring-slate-200/50"
                      : "hover:bg-white/50"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />
                  )}
                  <div className={`shrink-0 rounded-xl p-2 transition-colors ${
                    isActive ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500 group-hover:text-blue-900 group-hover:bg-blue-50/50"
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${isActive ? "text-slate-800" : "text-slate-600"}`}>
                      {label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      {description}
                    </p>
                  </div>
                </button>
              )
            })}
          </aside>

          {/* Área de Conteúdo */}
          <div className="flex-1 w-full min-w-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden min-h-[500px]">
              {activeTab === "negociacao" && <NegociacaoTab />}
              {activeTab === "compras" && <PropostasTab />}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default function CaixaDePropostasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" /></div>}>
      <CaixaDePropostasContent />
    </Suspense>
  )
}