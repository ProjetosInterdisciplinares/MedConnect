"use client"

import { Negociacao } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

type Acao = "confirmar-entrega" | "confirmar-recebimento" | "nao-concluida"

/**
 * Etapas depois do aceite:
 * - confirmar-entrega (vendedor) e confirmar-recebimento (comprador): com as duas, a negociação é concluída;
 * - nao-concluida (qualquer parte): o negócio não aconteceu.
 */
export default async function servicesConcluirNegociacao(id: number, acao: Acao): Promise<ServiceResult<Negociacao>> {
  const response = await fetch(buildUrl(`/api/medconnect/negociacoes/${id}/${acao}/`), {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleResponse<Negociacao>(response, "Não foi possível atualizar a negociação")
}
