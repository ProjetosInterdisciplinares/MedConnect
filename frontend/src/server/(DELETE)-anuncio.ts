"use client"

import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesDeleteAnuncio(nrAnuncio: number): Promise<ServiceResult<Record<string, never>>> {
  const response = await fetch(buildUrl(`/api/medconnect/anuncio/${nrAnuncio}/`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return handleResponse<Record<string, never>>(response, "Nao foi possivel remover anuncio")
}
