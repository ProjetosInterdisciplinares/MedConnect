"use client"

import React from "react"
import MeusAnuncios from "@/components/perfil/HistoricoDeOperacoes"

import { Handshake } from "lucide-react"
import SecaoTabs from "@/components/layout/SecaoTabs"

export default function MinhasNegociacoesPage() {
  return (
    <div className="relative w-full antialiased">

      <div className="w-full font-sans relative z-10">
        <SecaoTabs secao="negociacoes" />

        {/* Header da Página */}
        <div className="mb-6">
          <h1 className="sr-only">Minhas Negociações</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Acompanhe o status de todas as propostas que você enviou para anúncios de outras empresas e gerencie suas negociações.
          </p>
        </div>

        <MeusAnuncios />
      </div>
    </div>
  )
}
