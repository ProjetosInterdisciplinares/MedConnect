"use client"

import { SaldoCreditos } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetCreditosSaldo(): Promise<ServiceResult<SaldoCreditos>> {
  const response = await fetch(buildUrl("/api/medconnect/creditos/saldo/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<SaldoCreditos>(response, "Não foi possível carregar o saldo de créditos")
}
