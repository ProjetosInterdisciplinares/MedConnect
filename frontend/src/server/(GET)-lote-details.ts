"use client"

import { Lote } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetLoteDetails(pk: number): Promise<ServiceResult<Lote>> {
  const response = await fetch(buildUrl(`/api/medconnect/lote/${pk}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Lote>(response, "Nao foi possivel obter o lote")
}
