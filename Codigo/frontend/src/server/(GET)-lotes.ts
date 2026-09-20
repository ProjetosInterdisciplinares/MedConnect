"use client"

import { Lote } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetLotes(): Promise<ServiceResult<Lote[]>> {
  const response = await fetch(buildUrl("/api/medconnect/lote/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Lote[]>(response, "Nao foi possivel listar lotes")
}
