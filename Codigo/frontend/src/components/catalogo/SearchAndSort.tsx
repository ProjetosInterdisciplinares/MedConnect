"use client"

import React, { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"

export interface SearchAndSortProps {
  search: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearSearch: () => void
  ordenacao: string
  onOrdenacaoChange: (val: string) => void
  variant?: "standard" | "compact"
  idPrefix?: string
}

/**
 * Componente unificado para Busca e Ordenação.
 * Utilizado tanto na posição original (topo do grid) quanto dentro do card sticky de filtros.
 */
export const SearchAndSort = forwardRef<HTMLInputElement, SearchAndSortProps>(
  function SearchAndSort(
    {
      search,
      onSearchChange,
      onClearSearch,
      ordenacao,
      onOrdenacaoChange,
      variant = "standard",
      idPrefix = "main",
    },
    ref
  ) {
    const isCompact = variant === "compact"

    return (
      <div
        className={
          isCompact
            ? "w-full flex flex-col gap-2.5"
            : "w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        }
      >
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${
              isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
            }`}
            aria-hidden="true"
          />
          <Input
            ref={ref}
            id={`${idPrefix}-search-input`}
            type="text"
            placeholder="Buscar insumos, fabricantes..."
            aria-label="Buscar insumos e fabricantes"
            className={`pl-10 pr-10 bg-white border border-slate-200/80 rounded-xl shadow-xs text-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all ${
              isCompact ? "h-9 text-xs" : "h-10 text-sm"
            }`}
            value={search}
            onChange={onSearchChange}
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Limpar termo de busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded cursor-pointer"
              title="Limpar busca"
            >
              <X size={isCompact ? 13 : 15} />
            </button>
          )}
        </div>

        {/* Seletor de Ordenação */}
        <div className={isCompact ? "w-full" : "w-full sm:w-48 shrink-0"}>
          <Select
            value={ordenacao}
            onValueChange={(val) => onOrdenacaoChange(val || "Recentes")}
          >
            <SelectTrigger
              id={`${idPrefix}-sort-select`}
              aria-label="Ordenar anúncios por"
              className={`w-full bg-white border border-slate-200/80 rounded-xl shadow-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                isCompact ? "h-9 text-xs px-3" : "h-10 text-xs p-4.75"
              }`}
            >
              <SelectValue placeholder="Mais recentes" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="Recentes">Mais recentes</SelectItem>
              <SelectItem value="Antigos">Mais antigos</SelectItem>
              <SelectItem value="Menor preço">Menor preço</SelectItem>
              <SelectItem value="Maior preço">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }
)
