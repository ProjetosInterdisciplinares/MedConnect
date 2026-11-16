"use client"

import React, { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { MeusAnuncios } from "@/components/anunciar/meus-anuncios"
import servicesGetMatMed from "@/server/(GET)-mat-med"
import { MatMed } from "@/types"
import SecaoTabs from "@/components/layout/SecaoTabs"

export default function MeusAnunciosPage() {
  const [materiais, setMateriais] = useState<MatMed[]>([])

  useEffect(() => {
    async function fetchData() {
      const responseMateriais = await servicesGetMatMed()
      if (responseMateriais && !("isError" in responseMateriais)) {
        setMateriais(responseMateriais)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="relative w-full antialiased">

      <div className="w-full relative z-10">
        <SecaoTabs secao="anuncios" />

        {/* Header da Página */}
        <div className="mb-6">
          <h1 className="sr-only">Meus anúncios</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Acompanhe e gerencie os insumos que sua instituição publicou no catálogo.
          </p>
        </div>

        <main className="w-full">
          <MeusAnuncios materiais={materiais} />
        </main>
      </div>
    </div>
  )
}
