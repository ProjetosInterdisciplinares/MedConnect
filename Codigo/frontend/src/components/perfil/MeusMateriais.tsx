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
      <div className="w-full selection:bg-teal-500/20">
  
          {/* Cabeçalho e Pesquisa */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300">

            {/* Input de Busca com Micro-interação */}
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-teal-900 transition-colors duration-300" />
              <Input
                placeholder="Buscar material por nome..."
                className="pl-11 h-12 bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:border-teal-900 text-slate-800 placeholder:text-slate-400 rounded-xl shadow-inner transition-all duration-300"
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
                  className="group flex flex-col bg-white border border-slate-200 border-t-[3px] border-t-teal-600 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden"
                >
  
                  <CardHeader className="p-4 pb-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 truncate">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>MATERIAL HOSPITALAR</span>
                      </div>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-800 leading-snug line-clamp-2 min-h-11 group-hover:text-teal-700 transition-colors duration-300">
                      {material.ds_mat}
                    </CardTitle>
                  </CardHeader>
  
                  <div className="h-px bg-slate-100 mx-4" />

                  {/* Informações internas organizadas em bloco */}
                  <CardContent className="p-4 py-3 space-y-3 grow">
                    <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <Tag className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Marca</p>
                        <p className="font-bold text-slate-700 text-sm truncate">
                          {material.marca_nome || "Não informada"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
  
                  <div className="h-px bg-slate-100 mx-4" />

                  {/* Botão de Ação */}
                  <CardFooter className="p-4 pt-3">
                  <Button
                    onClick={() => router.push(`/cadastrar/insumo/${material.cd_mat}`)}
                    className="w-full bg-teal-700 hover:bg-teal-900 text-white font-semibold rounded-xl h-12 transition-all duration-300 flex items-center justify-center gap-2 group/btn shadow-sm active:scale-[0.98]"
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
                    className="mt-4 text-teal-600 p-0 h-auto font-semibold"
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