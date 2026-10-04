"use client"

import { TipoTransacaoCredito, TransacaoCredito } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetCreditosExtrato(
  params: { tipo?: TipoTransacaoCredito; limite?: number } = {}
): Promise<ServiceResult<TransacaoCredito[]>> {
  const query = new URLSearchParams()
  if (params.tipo) query.set("tipo", params.tipo)
  if (params.limite) query.set("limite", String(params.limite))
  const qs = query.toString()

  const response = await fetch(buildUrl(`/api/medconnect/creditos/extrato/${qs ? `?${qs}` : ""}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<TransacaoCredito[]>(response, "Não foi possível carregar o extrato de créditos")
}
