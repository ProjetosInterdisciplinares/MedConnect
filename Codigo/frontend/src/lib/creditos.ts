"use client"

/**
 * Utilitários compartilhados do sistema de créditos.
 *
 * Sincronização do saldo: qualquer tela que altere o saldo (compra ou
 * consumo de funcionalidade) deve chamar `notificarCreditosAtualizados`
 * com o novo saldo. O header escuta esse evento e se atualiza na hora.
 */

export const CREDITOS_ATUALIZADOS_EVENT = "medconnect:creditos-atualizados"

export type CreditosAtualizadosDetail = { saldo: number }

export function notificarCreditosAtualizados(saldo: number) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<CreditosAtualizadosDetail>(CREDITOS_ATUALIZADOS_EVENT, { detail: { saldo } })
  )
}

export function onCreditosAtualizados(callback: (saldo: number) => void) {
  const handler = (e: Event) => callback((e as CustomEvent<CreditosAtualizadosDetail>).detail.saldo)
  window.addEventListener(CREDITOS_ATUALIZADOS_EVENT, handler)
  return () => window.removeEventListener(CREDITOS_ATUALIZADOS_EVENT, handler)
}

export function formatCreditos(valor: number | null | undefined) {
  return (valor ?? 0).toLocaleString("pt-BR")
}

export function formatBRL(valor: string | number | null | undefined) {
  const n = typeof valor === "string" ? parseFloat(valor) : valor ?? 0
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
