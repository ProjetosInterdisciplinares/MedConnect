"use client"

import React, { useEffect, useState } from "react"
import { Package, Inbox } from "lucide-react"

import servicesGetMinhaPessoaJuridica from "@/server/(GET)-minha-pessoa-juridica"

import { PessoaJuridica } from "@/types"

import PerfilHeader from "@/components/perfil/PerfilHeader"
import MeusAnuncios from "@/components/perfil/HistoricoDeOperacoes"
import MeusMateriais from "@/components/perfil/MeusMateriais"

export default function PerfilPage() {
  const [empresa, setEmpresa] =
    useState<PessoaJuridica | null>(null)

  const [abaAtiva, setAbaAtiva] = useState<
    "anuncios" | "materiais"
  >("anuncios")

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
    <div className="max-w-5xl mx-auto py-8">

      <PerfilHeader empresa={empresa} />

      <div className="flex gap-2 mb-8 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setAbaAtiva("anuncios")}
          className={`hover:cursor-pointer px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            abaAtiva === "anuncios"
              ? "border-sky-800 text-sky-800"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Package size={16} className="inline mr-2" />
          Histórico de operações
        </button>

        <button
          onClick={() => setAbaAtiva("materiais")}
          className={`hover:cursor-pointer px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            abaAtiva === "materiais"
              ? "border-sky-800 text-sky-800"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Inbox size={16} className="inline mr-2" />
          Materiais Cadastrados
        </button>
      </div>

      {abaAtiva === "anuncios" && (
        <MeusAnuncios />
      )}

      {abaAtiva === "materiais" && (
        <MeusMateriais />
      )}
    </div>
  )
}