"use client"

import React from "react"
import MeusAnuncios from "@/components/perfil/HistoricoDeOperacoes"
import AnimatedBackground from "@/components/ui/animated-background"
import { Handshake } from "lucide-react"

export default function MinhasNegociacoesPage() {
  return (
    <div className="relative min-h-screen w-full antialiased bg-slate-50/50 selection:bg-blue-500/20">
      <AnimatedBackground />
      <div className="max-w-[1200px] mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8 font-sans relative z-10">
        
        {/* Header da Página */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <Handshake size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Minhas Negociações
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl ml-[52px]">
            Acompanhe o status de todas as propostas que você enviou para anúncios de outras empresas e gerencie suas negociações.
          </p>
        </div>

        <MeusAnuncios />
      </div>
    </div>
  )
}
