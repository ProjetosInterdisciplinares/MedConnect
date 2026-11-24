"use client"

import React, { useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Etiqueta com o significado em um balão: abre ao passar o mouse, ao focar pelo teclado
 * e ao clicar/tocar (no celular não há "passar o mouse"). O clique não abre o item da lista.
 */
export default function RotuloExplicado({ titulo, explicacao, className = "", children }: {
  titulo: string
  explicacao: string
  className?: string
  children: React.ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <Tooltip
      open={aberto}
      onOpenChange={(abrir, detalhes) => {
        if (detalhes.reason === "trigger-press") return // o clique é tratado abaixo (alterna)
        setAberto(abrir)
      }}
    >
      <TooltipTrigger
        type="button"
        aria-label={`${titulo}: ${explicacao}`}
        onClick={(e) => {
          e.stopPropagation()
          setAberto((v) => !v)
        }}
        className={`cursor-help outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${className}`}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs flex-col items-start gap-0 py-2 text-left leading-relaxed">
        <p className="font-semibold">{titulo}</p>
        <p className="mt-0.5">{explicacao}</p>
      </TooltipContent>
    </Tooltip>
  )
}
