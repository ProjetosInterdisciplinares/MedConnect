"use client"

import { GerarAnuncioRequest, GerarAnuncioSuccessResponse } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGerarAnuncio(payload: GerarAnuncioRequest): Promise<ServiceResult<GerarAnuncioSuccessResponse>> {
  const response = await fetch(buildUrl("/api/medconnect/gerar-anuncio/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<GerarAnuncioSuccessResponse>(response, "Nao foi possivel gerar texto do anuncio")
}
