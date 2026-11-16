"use client"

import React, { useId, useMemo, useRef, useState } from "react"
import { AlertCircle, ChevronDown } from "lucide-react"

export type Sugestao<T = unknown> = {
  /** Texto que vai para o campo ao escolher a sugestão. */
  valor: string
  /** Linha secundária, ex.: "Medix · Caixa c/ 100". */
  detalhe?: string
  /** Dados extras repassados em onSelecionar. */
  dados?: T
}

type Props<T> = {
  label: string
  icon: React.ElementType
  value: string
  onChange: (texto: string) => void
  sugestoes: Sugestao<T>[]
  onSelecionar?: (sugestao: Sugestao<T>) => void
  placeholder?: string
  required?: boolean
  error?: string
  maxLength?: number
  /** Mostra sugestões mesmo com o campo vazio (útil em listas curtas, como unidades). */
  mostrarComCampoVazio?: boolean
  /** Elemento ao lado do rótulo, ex.: ícone informativo. */
  ajuda?: React.ReactNode
}

const LIMITE = 8

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** Campo de texto livre com lista de sugestões (combobox acessível). */
export default function CampoSugestoes<T>({
  label, icon: Icon, value, onChange, sugestoes, onSelecionar, placeholder, required, error, maxLength,
  mostrarComCampoVazio = false, ajuda,
}: Props<T>) {
  const id = useId()
  const listaId = `${id}-lista`
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtradas = useMemo(() => {
    const termo = normalizar(value)
    if (!termo && !mostrarComCampoVazio) return []
    const lista = termo
      ? sugestoes.filter((s) => normalizar(s.valor).includes(termo) || normalizar(s.detalhe || "").includes(termo))
      : sugestoes
    // Quem começa com o termo aparece primeiro
    return [...lista]
      .sort((a, b) => Number(normalizar(b.valor).startsWith(termo)) - Number(normalizar(a.valor).startsWith(termo)))
      .slice(0, LIMITE)
  }, [value, sugestoes, mostrarComCampoVazio])

  const visivel = aberto && filtradas.length > 0

  function escolher(sugestao: Sugestao<T>) {
    onChange(sugestao.valor)
    onSelecionar?.(sugestao)
    setAberto(false)
    setAtivo(-1)
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setAberto(true)
      setAtivo((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && visivel && ativo >= 0) {
      e.preventDefault()
      escolher(filtradas[ativo])
    } else if (e.key === "Escape") {
      setAberto(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 text-left">
      <span className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500 text-xs mt-0.5" aria-hidden="true">*</span>}
        </label>
        {ajuda}
      </span>

      <div className="relative">
        <div className="absolute left-3 top-[11px] text-slate-400 pointer-events-none">
          <Icon size={16} />
        </div>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={visivel}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={visivel && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
          autoComplete="off"
          value={value}
          maxLength={maxLength}
          required={required}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value)
            setAberto(true)
            setAtivo(-1)
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onKeyDown={aoTeclar}
          className={`w-full pl-9 pr-9 py-2 bg-slate-50 border rounded-xl transition-all duration-200 outline-none h-10 text-sm ${
            error
              ? "border-red-300 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:border-red-400"
              : "border-slate-200 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 hover:border-slate-300"
          }`}
        />
        {sugestoes.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Mostrar sugestões de ${label.toLowerCase()}`}
            onMouseDown={(e) => {
              e.preventDefault()
              setAberto((a) => !a)
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600"
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        )}

        {visivel && (
          <ul
            id={listaId}
            role="listbox"
            className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtradas.map((s, i) => (
              <li
                key={`${s.valor}-${s.detalhe ?? ""}-${i}`}
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => {
                  e.preventDefault()
                  escolher(s)
                }}
                onMouseEnter={() => setAtivo(i)}
                className={`px-3 py-2 cursor-pointer ${i === ativo ? "bg-blue-50" : ""}`}
              >
                <span className="block text-sm text-slate-900">{s.valor}</span>
                {s.detalhe && <span className="block text-xs text-slate-500">{s.detalhe}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
