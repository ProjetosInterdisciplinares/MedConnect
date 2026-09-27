"use client"

import { UpdateNegociacaoForm, Negociacao } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateNegociacao(id: number, data: UpdateNegociacaoForm): Promise<ServiceResult<Negociacao>> {
  const response = await fetch(buildUrl(`/api/medconnect/negociacoes/${id}/`), {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  return handleResponse<Negociacao>(response, "Nao foi possivel atualizar negociacao")
}
