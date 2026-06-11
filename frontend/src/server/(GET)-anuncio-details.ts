"use client"

import { Anuncio } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetAnuncioDetails(nrAnuncio: number): Promise<ServiceResult<Anuncio>> {
  const response = await fetch(buildUrl(`/api/medconnect/anuncio/${nrAnuncio}/`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Anuncio>(response, "Nao foi possivel obter o anuncio")
}
