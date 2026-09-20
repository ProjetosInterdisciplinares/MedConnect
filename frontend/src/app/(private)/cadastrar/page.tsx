"use client"

import { useState } from "react"
import { Package, Layers, Factory } from "lucide-react"

import FormInsumo from "@/components/cadastro/FormInsumo"
import FormLote from "@/components/cadastro/FormLote"
import FormFabricante from "@/components/cadastro/FormFabricante"
import AnimatedBackground from "@/components/ui/animated-background"


type Tab = "insumo" | "lote" | "fabricante"

export default function CadastroPage() {
  const [activeTab, setActiveTab] = useState<Tab>("insumo")

  return (
    <div className="relative min-h-screen w-full antialiased selection:bg-teal-500/20">
      <AnimatedBackground />
      <div className="max-w-4xl mx-auto py-8 px-4 relative z-10">
        <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-400">
          Cadastro de Insumos | Lotes | Fabricantes
        </h1>

        <p className="text-zinc-500 text-sm mt-1">
          Cadastre novos insumos ou fabricantes e registre a entrada de novos
          lotes.
        </p>
      </div>

      <div className="flex items-center gap-2 p-1.5 bg-white/60 backdrop-blur-md border border-teal-100/50 rounded-2xl w-fit mb-8 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("insumo")}
          className={`hover:cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "insumo"
              ? "bg-teal-700 text-white shadow-md hover:bg-teal-800"
              : "text-teal-900 hover:bg-teal-50"
          }`}
        >
          <Package size={16} />
          Insumo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lote")}
          className={`hover:cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "lote"
              ? "bg-teal-700 text-white shadow-md hover:bg-teal-800"
              : "text-teal-900 hover:bg-teal-50"
          }`}
        >
          <Layers size={16} />
          Lote
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fabricante")}
          className={`hover:cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "fabricante"
              ? "bg-teal-700 text-white shadow-md hover:bg-teal-800"
              : "text-teal-900 hover:bg-teal-50"
          }`}
        >
          <Factory size={16} />
          Fabricante
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-600 to-teal-400" />
        {activeTab === "insumo" && <FormInsumo />}

        {activeTab === "lote" && <FormLote />}

        {activeTab === "fabricante" && <FormFabricante />}
      </div>
    </div>
    </div>
    
  )
}