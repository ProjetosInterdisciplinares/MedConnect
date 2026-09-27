"use client"

import { CreateNegociacaoForm, Negociacao } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesPostNegociacao(data: CreateNegociacaoForm): Promise<ServiceResult<Negociacao>> {
  const response = await fetch(buildUrl("/api/medconnect/negociacoes/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  return handleResponse<Negociacao>(response, "Nao foi possivel criar negociacao")
}
