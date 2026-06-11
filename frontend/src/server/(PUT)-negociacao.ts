"use client"

import { Negociacao, UpdateNegociacaoForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateNegociacao(pk: number, payload: UpdateNegociacaoForm): Promise<ServiceResult<Negociacao>> {
  const response = await fetch(buildUrl(`/api/medconnect/negociacao/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Negociacao>(response, "Nao foi possivel atualizar negociacao")
}
