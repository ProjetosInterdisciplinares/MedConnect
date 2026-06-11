"use client"

import { Negociacao } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetNegociacoes(): Promise<ServiceResult<Negociacao[]>> {
  const response = await fetch(buildUrl("/api/medconnect/negociacao/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Negociacao[]>(response, "Nao foi possivel listar negociacoes")
}
