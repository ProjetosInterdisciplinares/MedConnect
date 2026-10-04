"use client"

import { PacoteCredito } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetCreditosPacotes(): Promise<ServiceResult<PacoteCredito[]>> {
  const response = await fetch(buildUrl("/api/medconnect/creditos/pacotes/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<PacoteCredito[]>(response, "Não foi possível carregar os pacotes de créditos")
}
