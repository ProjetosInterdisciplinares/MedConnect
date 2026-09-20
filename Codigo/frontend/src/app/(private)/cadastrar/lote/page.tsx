"use client"

import FormLote from "@/components/cadastro/FormLote"

export default function LotePage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Cadastro de Lotes
        </h1>

        <p className="text-zinc-500 text-sm mt-1">
          Registre novos lotes de materiais.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 md:p-8 shadow-sm">
        <FormLote />
      </div>
    </div>
  )
}