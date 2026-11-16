"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/**
 * Padrão MedConnect para avisos, confirmações e resumos em janela:
 * fundo branco, título escuro, texto em cinza, ações à direita
 * (secundária "Cancelar" à esquerda da principal).
 */

export const BOTAO = {
  primario: "h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer",
  secundario: "h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer",
  perigo: "h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer",
} as const

const LARGURAS = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg", xl: "sm:max-w-xl" } as const

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: React.ReactNode
  descricao?: React.ReactNode
  children?: React.ReactNode
  /** Botões do rodapé (use BOTAO.*). Ordem: secundário, principal. */
  acoes?: React.ReactNode
  largura?: keyof typeof LARGURAS
}

/** Janela base: título, descrição, conteúdo livre e ações. */
export function ModalPadrao({ open, onOpenChange, titulo, descricao, children, acoes, largura = "md" }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={`${LARGURAS[largura]} p-6 gap-0 bg-white max-h-[90vh] overflow-y-auto`}>
        <DialogTitle className="text-lg font-semibold text-slate-900">{titulo}</DialogTitle>
        {descricao && <DialogDescription className="mt-2 text-sm text-slate-600 leading-relaxed">{descricao}</DialogDescription>}
        {children && <div className="mt-5">{children}</div>}
        {acoes && <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{acoes}</div>}
      </DialogContent>
    </Dialog>
  )
}

/** Lista "rótulo · valor" usada nos resumos das janelas. */
export function Resumo({ itens }: { itens: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
      {itens.map(([rotulo, valor], i) => (
        <div key={i} className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-slate-500 shrink-0">{rotulo}</dt>
          <dd className="font-medium text-slate-900 text-right tabular-nums break-words min-w-0">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Aviso com um único botão. */
export function AvisoDialog({ open, onClose, titulo, mensagem, botao = "Entendi" }: {
  open: boolean
  onClose: () => void
  titulo: React.ReactNode
  mensagem: React.ReactNode
  botao?: string
}) {
  return (
    <ModalPadrao
      open={open}
      onOpenChange={(o) => { if (!o) onClose() }}
      titulo={titulo}
      descricao={mensagem}
      acoes={<button type="button" onClick={onClose} className={BOTAO.secundario}>{botao}</button>}
    />
  )
}

/** Confirmação com Cancelar + ação principal (ou destrutiva). */
export function ConfirmarDialog({
  open, onOpenChange, titulo, mensagem, children, confirmar, onConfirmar,
  cancelar = "Cancelar", variante = "primario", carregando = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  titulo: React.ReactNode
  mensagem?: React.ReactNode
  children?: React.ReactNode
  confirmar: string
  onConfirmar: () => void
  cancelar?: string
  variante?: "primario" | "perigo"
  carregando?: boolean
}) {
  return (
    <ModalPadrao
      open={open}
      onOpenChange={(o) => { if (!carregando) onOpenChange(o) }}
      titulo={titulo}
      descricao={mensagem}
      acoes={
        <>
          <button type="button" onClick={() => onOpenChange(false)} disabled={carregando} className={BOTAO.secundario}>{cancelar}</button>
          <button type="button" onClick={onConfirmar} disabled={carregando} className={BOTAO[variante]}>
            {carregando && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {confirmar}
          </button>
        </>
      }
    >
      {children}
    </ModalPadrao>
  )
}
