"use client"

import { CreateNegociacaoForm, Negociacao } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreateNegociacao(payload: CreateNegociacaoForm): Promise<ServiceResult<Negociacao>> {
  const response = await fetch(buildUrl("/api/medconnect/negociacao/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Negociacao>(response, "Nao foi possivel cadastrar negociacao")
}
