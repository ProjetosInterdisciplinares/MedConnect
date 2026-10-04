"use client"

import { ComprarCreditosRequest, ComprarCreditosResponse } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesPostComprarCreditos(
  data: ComprarCreditosRequest
): Promise<ServiceResult<ComprarCreditosResponse>> {
  const response = await fetch(buildUrl("/api/medconnect/creditos/comprar/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  return handleResponse<ComprarCreditosResponse>(response, "Não foi possível concluir a compra de créditos")
}
