"use client"

import React, { useEffect, useState } from "react"
import { Inbox } from "lucide-react"

import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"

import { PessoaJuridica } from "@/types"

import PerfilHeader from "@/components/perfil/PerfilHeader"
import MeusMateriais from "@/components/perfil/MeusMateriais"
import AnimatedBackground from "@/components/ui/animated-background"

export default function PerfilPage() {
  const [empresa, setEmpresa] =
    useState<PessoaJuridica | null>(null)

  useEffect(() => {
    async function carregarPerfil() {
      const result =
        await servicesGetMinhaPessoaJuridica()

      if (
        result &&
        typeof result === "object" &&
        !("isError" in result)
      ) {
        setEmpresa(result)
      }
    }

    carregarPerfil()
  }, [])

  return (
    <div className="relative min-h-screen w-full antialiased selection:bg-blue-500/20">
      <AnimatedBackground />
      <div className="max-w-5xl mx-auto py-8 px-4 relative z-10">

        <PerfilHeader empresa={empresa} />

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-6">
            <Inbox size={24} className="text-blue-700" />
            <h2 className="text-xl font-bold text-slate-800">Materiais Cadastrados</h2>
          </div>
          
          <MeusMateriais />
        </div>
      </div>
    </div>
  )
}