"use client"

import { Anuncio } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetAnuncios(p0: number): Promise<ServiceResult<Anuncio[]>> {
  const response = await fetch(buildUrl("/api/medconnect/anuncio/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Anuncio[]>(response, "Nao foi possivel listar anuncios")
}
