"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Package, Tag, Building2, Layers } from "lucide-react"

import { MatMed } from "@/types"
import servicesGetMaterialDetails from "@/server/(GET)-material-details"
import AnimatedBackground from "@/components/ui/animated-background"

export default function MaterialDetails() {
  const params = useParams()
  const router = useRouter()

  const materialId = params.materialId as string

  const [material, setMaterial] = useState<MatMed | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!materialId) return

    servicesGetMaterialDetails(materialId).then((response) => {
      setLoading(false)
      if ("isError" in response) {
        console.log("Erro:", response.status)
        return
      }
      setMaterial(response)
    })
  }, [materialId])

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent w-full flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando detalhes do insumo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full antialiased selection:bg-teal-500/20">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto py-8 px-4 relative z-10">
        
        {/* Header e Voltar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-teal-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-teal-600" />
              Detalhes do Insumo
            </h1>
            <p className="text-teal-700/80 text-sm mt-1 font-medium">
              Visualize as informações técnicas deste material hospitalar
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl shadow-sm hover:shadow-md hover:border-teal-300 hover:text-teal-800 transition-all duration-300"
          >
            <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Voltar
          </button>
        </div>

        {/* Card de Detalhes */}
        <div className="bg-white border border-slate-200 border-t-[4px] border-t-teal-600 rounded-3xl p-6 md:p-8 shadow-sm">
          
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-2">{material?.ds_mat ?? "Nome não disponível"}</h2>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
              ID #{material?.cd_mat ?? materialId}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                <Tag className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Marca / Fabricante</p>
                <p className="font-bold text-slate-800">{material?.ds_marca ?? material?.ds_pessoaj ?? "Não informada"}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                <Layers className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Categoria / Tipo</p>
                <p className="font-bold text-slate-800">{material?.ds_tipo ?? "Não categorizado"}</p>
              </div>
            </div>
            
            {/* Outros atributos podem ser adicionados aqui no futuro */}
          </div>

        </div>

      </div>
    </div>
  )
}