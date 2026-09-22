"use client"

import { Package, PlusCircle } from "lucide-react"

import FormInsumo from "@/components/cadastro/FormInsumo"
import AnimatedBackground from "@/components/ui/animated-background"

export default function CadastroPage() {
  return (
    <div className="relative min-h-screen w-full antialiased bg-slate-50/50 selection:bg-blue-500/20">
      <AnimatedBackground />
      <div className="max-w-[1200px] mx-auto py-8 md:py-12 px-4 sm:px-6 lg:px-8 font-sans relative z-10">
        
        {/* Header da Página */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <PlusCircle size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Cadastro de Insumos
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl ml-[52px]">
            Cadastre novos insumos e medicamentos no sistema. Uma vez cadastrados, eles estarão disponíveis para serem anunciados no catálogo do marketplace.
          </p>
        </div>

        {/* Layout Master-Detail / Sidebar */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Navegação Lateral */}
          <aside className="w-full md:w-72 shrink-0 flex flex-col gap-2">
            <button
              type="button"
              className="relative w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group bg-white shadow-sm ring-1 ring-slate-200/50 cursor-default"
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-900 rounded-r-full" />
              <div className="shrink-0 rounded-xl p-2 transition-colors bg-blue-50 text-blue-900">
                <Package size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Insumos
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  Adicionar um novo material ou medicamento
                </p>
              </div>
            </button>
          </aside>

          {/* Área de Conteúdo */}
          <div className="flex-1 w-full min-w-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden min-h-[500px] p-6 md:p-8">
              <FormInsumo />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}