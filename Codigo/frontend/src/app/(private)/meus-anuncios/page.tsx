"use client"

import React, { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { MeusAnuncios } from "@/components/anunciar/meus-anuncios"
import AnimatedBackground from "@/components/ui/animated-background"
import servicesGetMatMed from "@/server/(GET)-mat-med"
import { MatMed } from "@/types"

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
    <div className="relative min-h-screen w-full antialiased bg-slate-50/50 selection:bg-blue-900/20">
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto py-8 px-4 relative z-10">
        
        {/* Header da Página */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <Package size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Meus Anúncios
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl">
            Visualize e gerencie as suas publicações no catálogo B2B.
          </p>
        </div>

        <main className="w-full">
          <MeusAnuncios materiais={materiais} />
        </main>
      </div>
    </div>
  )
}
