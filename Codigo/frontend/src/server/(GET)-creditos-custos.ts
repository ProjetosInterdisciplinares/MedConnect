"use client"

import { CustoFuncionalidade } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetCreditosCustos(): Promise<ServiceResult<CustoFuncionalidade[]>> {
  const response = await fetch(buildUrl("/api/medconnect/creditos/custos/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<CustoFuncionalidade[]>(response, "Não foi possível carregar os custos das funcionalidades")
}
