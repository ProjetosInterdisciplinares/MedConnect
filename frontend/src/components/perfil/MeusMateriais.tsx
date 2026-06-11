"use client"

import React, { useEffect, useState, useMemo } from "react"
import servicesGetMeusMateriais from "@/server/(GET)-meus-materiais"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Tag, Building2, ChevronRight, Stethoscope, PackageX } from "lucide-react"
import { MatMed } from "@/types"
import { useRouter } from "next/navigation"

export default function MeusMateriais() {
  const router = useRouter()
  const [materiais, setMateriais] =
    useState<MatMed[]>([])
  const [search, setSearch] = useState("")

  const filteredMaterials = useMemo(() => {
      if (!materiais) return []
      return materiais.filter((m) =>
        m?.ds_mat?.toLowerCase().includes(search.toLowerCase())
      )
    }, [materiais, search])

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    async function carregarMateriais() {
      const result =
        await servicesGetMeusMateriais()

      if (
        result &&
        typeof result === "object" &&
        !("isError" in result)
      ) {
        setMateriais(result)
      }

      setLoading(false)
    }

    carregarMateriais()
  }, [])

  if (loading) {
    return (
      <p className="text-zinc-500">
        Carregando materiais...
      </p>
    )
  }

  return (
      <div className="min-h-screen bg-slate-50 w-full selection:bg-cyan-500/20">
  
          {/* Cabeçalho e Pesquisa */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300">

            {/* Input de Busca com Micro-interação */}
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-cyan-900 transition-colors duration-300" />
              <Input
                placeholder="Buscar material por nome..."
                className="pl-11 h-12 bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-900 text-slate-800 placeholder:text-slate-400 rounded-xl shadow-inner transition-all duration-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
  
          {/* Grid de Materiais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map((material, index) => (
                <Card
                  key={index}
                  className="group flex flex-col bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-cyan-500/4 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Linha indicadora sutil que acende no Hover */}
                  <div className="h-1 w-full bg-cyan-700" />
  
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-2 bg-cyan-50 rounded-xl text-cyan-700 border border-cyan-100/50">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">
                        Material Hospitalar
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-800 leading-snug line-clamp-2 min-h-11 group-hover:text-cyan-700 transition-colors duration-300">
                      {material.ds_mat}
                    </CardTitle>
                  </CardHeader>
  
                  {/* Informações internas organizadas em bloco */}
                  <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
  
                      {/* Linha Marca */}
                      <div className="flex items-center gap-3 text-sm">
                        <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Marca</p>
                          <p className="font-semibold text-slate-700 truncate">
                            {material.ds_marca || "Não informada"}
                          </p>
                        </div>
                      </div>
  
                    </div>
                  </CardContent>
  
                  {/* Botão de Ação */}
                  <CardFooter className="p-1 pt-1 mt-auto">
                  <Button
                    onClick={() => router.push(`/cadastrar/insumo/${material.cd_mat}`)}
                    className="w-full bg-cyan-700 hover:bg-cyan-900 text-white font-semibold rounded-xl h-12 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-sm active:scale-[0.98]"
                  >
                    Ver detalhes
  
                    <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Button>
                </CardFooter>
                </Card>
              ))
            ) : (
              /* Estado Vazio (Nenhum resultado) */
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200/60 shadow-sm transition-all duration-300">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                  <PackageX className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Nenhum material encontrado</h3>
                <p className="text-slate-500 max-w-sm mt-2 text-sm">
                  Não conseguimos encontrar nenhum resultado para <span className="font-semibold text-slate-700">"{search}"</span>. Tente refinar sua busca.
                </p>
                {search && (
                  <Button
                    variant="link"
                    onClick={() => setSearch("")}
                    className="mt-4 text-cyan-600 p-0 h-auto font-semibold"
                  >
                    Limpar filtro de busca
                  </Button>
                )}
              </div>
            )}
          </div>
      </div>
    )
}