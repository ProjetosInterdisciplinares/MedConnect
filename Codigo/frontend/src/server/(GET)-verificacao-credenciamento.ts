"use client"

import { VerificacaoCredenciamento } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

/** Relatório de verificação do CNPJ (usa a última consulta guardada). Somente admin. */
export default async function servicesGetVerificacaoCredenciamento(
  empresaId: number
): Promise<ServiceResult<VerificacaoCredenciamento>> {
  const response = await fetch(buildUrl(`/api/medconnect/admin/pessoas/${empresaId}/verificacao/`), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  })

  return handleResponse<VerificacaoCredenciamento>(response, "Não foi possível verificar o CNPJ")
}
