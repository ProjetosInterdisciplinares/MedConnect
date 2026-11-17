"use client"

import { Info } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CODIGOS_REFERENCIA, CodigoReferencia } from "@/lib/codigos-referencia"

/** Ícone "i" ao lado de um código (TUSS, SIMPRO, Brasíndice, CATMAT) que explica o que é e onde encontrar. */
export default function InfoCodigo({ codigo }: { codigo: CodigoReferencia }) {
  const info = CODIGOS_REFERENCIA[codigo]
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={`O que é ${info.titulo}?`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-blue-700 focus-visible:text-blue-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-help"
      >
        <Info size={14} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs flex-col items-start gap-0 py-2 text-left leading-relaxed">
        <p className="font-semibold">{info.titulo}</p>
        <p className="mt-1">{info.oQueE}</p>
        <p className="mt-1.5"><span className="font-semibold">Onde encontrar:</span> {info.ondeEncontrar}</p>
      </TooltipContent>
    </Tooltip>
  )
}
