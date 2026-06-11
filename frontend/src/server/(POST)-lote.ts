"use client"

import { CreateLoteForm, Lote } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreateLote(payload: CreateLoteForm): Promise<ServiceResult<Lote>> {
  const response = await fetch(buildUrl("/api/medconnect/lote/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Lote>(response, "Nao foi possivel cadastrar lote")
}
