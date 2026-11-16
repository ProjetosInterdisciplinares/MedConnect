"use client"

import React, { useEffect, useState } from "react"

import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"
import { PessoaJuridica } from "@/types"

import PerfilHeader from "@/components/perfil/PerfilHeader"
import MeusMateriais from "@/components/perfil/MeusMateriais"
import CarteiraCreditos from "@/components/creditos/CarteiraCreditos"
import AlertasInteresse from "@/components/perfil/AlertasInteresse"

export default function PerfilPage() {
  const [empresa, setEmpresa] = useState<PessoaJuridica | null>(null)

  useEffect(() => {
    async function carregarPerfil() {
      const result = await servicesGetMinhaPessoaJuridica()
      if (result && typeof result === "object" && !("isError" in result)) setEmpresa(result)
    }
    carregarPerfil()
  }, [])

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="sr-only">Meu perfil</h1>
        <p className="text-sm text-slate-500">Dados da instituição, créditos, alertas de interesse e materiais cadastrados.</p>
      </header>

      <div className="space-y-6">
        {/* Dados da instituição ao lado do saldo; movimentações abaixo */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 min-w-0">
            <PerfilHeader empresa={empresa} />
          </div>
          <CarteiraCreditos emGrade />
        </div>

        <AlertasInteresse />

        <MeusMateriais />
      </div>
    </div>
  )
}
