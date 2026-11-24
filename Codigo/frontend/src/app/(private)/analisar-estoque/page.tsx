"use client"

import AnaliseEstoque from "@/components/estoque/AnaliseEstoque"
import SecaoTabs from "@/components/layout/SecaoTabs"

export default function AnalisarEstoquePage() {
  return (
    <div className="w-full">
      <SecaoTabs secao="anuncios" />
      <header className="mb-6">
        <h1 className="sr-only">Analisar estoque com IA</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Envie a movimentação do seu estoque. A IA encontra o que sai pouco, sobra ou vai vencer sem uso e indica o que vale anunciar.
        </p>
      </header>
      <AnaliseEstoque />
    </div>
  )
}
