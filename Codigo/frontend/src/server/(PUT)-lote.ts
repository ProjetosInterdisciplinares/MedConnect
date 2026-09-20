"use client"

import { Lote, UpdateLoteForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateLote(pk: number, payload: UpdateLoteForm): Promise<ServiceResult<Lote>> {
  const response = await fetch(buildUrl(`/api/medconnect/lote/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Lote>(response, "Nao foi possivel atualizar lote")
}
