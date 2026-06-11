"use client"

import FormFabricante from "@/components/cadastro/FormFabricante"

export default function FabricantePage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Cadastro de Fabricantes
        </h1>

        <p className="text-zinc-500 text-sm mt-1">
          Cadastre novos fabricantes de materiais e medicamentos.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm">
        <FormFabricante />
      </div>
    </div>
  )
}