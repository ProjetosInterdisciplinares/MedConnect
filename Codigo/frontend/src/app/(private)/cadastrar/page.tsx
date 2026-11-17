"use client"

import FormInsumo from "@/components/cadastro/FormInsumo"

export default function CadastroPage() {
  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="sr-only">Cadastrar insumo</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Cadastre uma vez os materiais e medicamentos da sua instituição. Ao publicar, basta escolher o insumo e informar os dados do lote.
        </p>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
        <FormInsumo />
      </div>
    </div>
  )
}
