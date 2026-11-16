"use client"

import { VerificacaoCredenciamento } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

/** Consulta a Receita Federal de novo e devolve o relatório atualizado. Somente admin. */
export default async function servicesAtualizarVerificacaoCredenciamento(
  empresaId: number
): Promise<ServiceResult<VerificacaoCredenciamento>> {
  const response = await fetch(buildUrl(`/api/medconnect/admin/pessoas/${empresaId}/verificacao/`), {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleResponse<VerificacaoCredenciamento>(response, "Não foi possível consultar a Receita Federal")
}
