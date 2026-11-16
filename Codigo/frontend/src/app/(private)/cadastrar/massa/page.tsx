"use client"

import CadastroMassa from "@/components/anunciar/cadastro-massa"
import SecaoTabs from "@/components/layout/SecaoTabs"

export default function CadastroMassaPage() {
  return (
    <div className="w-full">
      <SecaoTabs secao="ofertar" />
      <header className="mb-6">
        <h1 className="sr-only">Cadastro em massa</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Para vários itens de uma vez: a planilha cadastra os insumos que ainda não existem e publica os anúncios.
        </p>
      </header>
      <CadastroMassa />
    </div>
  )
}
