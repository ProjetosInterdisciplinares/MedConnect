"use client"

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronRight, Plus } from "lucide-react"
import servicesGetMeusMateriais from "@/server/(GET)-meus-materiais"
import { MatMed } from "@/types"

/** Tabela dos insumos cadastrados pela instituição (página de perfil). */
export default function MeusMateriais() {
  const [materiais, setMateriais] = useState<MatMed[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarMateriais() {
      const result = await servicesGetMeusMateriais()
      if (result && typeof result === "object" && !("isError" in result)) setMateriais(result)
      setLoading(false)
    }
    carregarMateriais()
  }, [])

  const filtrados = useMemo(() => {
    const termo = search.toLowerCase().trim()
    if (!termo) return materiais
    return materiais.filter((m) =>
      [m.ds_mat, m.ds_marca, m.cd_tuss].some((v) => v?.toLowerCase().includes(termo)),
    )
  }, [materiais, search])

  return (
    <section className="bg-white border border-slate-200 rounded-xl" aria-labelledby="materiais-titulo">
      <header className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
        <div>
          <h2 id="materiais-titulo" className="text-base font-semibold text-slate-900">Materiais cadastrados</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {loading ? "Carregando…" : `${materiais.length} ${materiais.length === 1 ? "insumo" : "insumos"} disponíveis para anunciar`}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar material"
              aria-label="Buscar materiais cadastrados"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 placeholder:text-slate-400"
            />
          </div>
          <Link
            href="/cadastrar"
            className="shrink-0 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Plus size={15} aria-hidden="true" /> Cadastrar
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="px-5 pb-5 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="px-5 pb-6 pt-2 text-sm text-slate-500">
          {search ? (
            <>Nenhum material encontrado para <span className="font-medium text-slate-700">“{search}”</span>.{" "}
              <button type="button" onClick={() => setSearch("")} className="font-semibold text-blue-700 hover:underline">Limpar busca</button>
            </>
          ) : (
            <>Nenhum material cadastrado. <Link href="/cadastrar" className="font-semibold text-blue-700 hover:underline">Cadastrar o primeiro insumo</Link></>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th scope="col" className="px-5 py-2.5 font-medium">Insumo</th>
                <th scope="col" className="px-3 py-2.5 font-medium hidden md:table-cell">Marca</th>
                <th scope="col" className="px-3 py-2.5 font-medium hidden lg:table-cell">Categoria</th>
                <th scope="col" className="px-3 py-2.5 font-medium hidden lg:table-cell">Unidade</th>
                <th scope="col" className="px-3 py-2.5 font-medium hidden sm:table-cell">TUSS</th>
                <th scope="col" className="px-5 py-2.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((m) => (
                <tr key={m.cd_mat} className="hover:bg-slate-50/70">
                  <td className="pl-5 pr-2 py-3 max-w-[12rem] sm:max-w-[22rem]">
                    <p className="font-medium text-slate-900 truncate" title={m.ds_mat}>{m.ds_mat || "Sem nome"}</p>
                    <p className="md:hidden text-xs text-slate-500 truncate">{m.ds_marca || "—"}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700 hidden md:table-cell">{m.ds_marca || "—"}</td>
                  <td className="px-3 py-3 text-slate-700 hidden lg:table-cell">{m.ds_tipo || "—"}</td>
                  <td className="px-3 py-3 text-slate-700 hidden lg:table-cell">{m.unidade_med || "—"}</td>
                  <td className="px-3 py-3 text-slate-700 tabular-nums hidden sm:table-cell">{m.cd_tuss || "—"}</td>
                  <td className="pl-2 pr-5 py-3 text-right">
                    <Link
                      href={`/cadastrar/insumo/${m.cd_mat}`}
                      className="inline-flex items-center gap-0.5 text-sm font-semibold text-blue-700 hover:underline whitespace-nowrap"
                      aria-label={`Ver detalhes de ${m.ds_mat || "insumo"}`}
                    >
                      Detalhes <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
