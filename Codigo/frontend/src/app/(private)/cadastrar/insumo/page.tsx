"use client"

import FormInsumo from "@/components/cadastro/FormInsumo"

export default function CadastroInsumoPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Cadastro de Insumos
        </h1>

        <p className="text-muted text-sm mt-1">
          Cadastre novos insumos.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-sm">
        <FormInsumo />
      </div>
    </div>
  )
}