"use client"

import { Anuncio, CreateAnuncioForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreateAnuncio(payload: CreateAnuncioForm): Promise<ServiceResult<Anuncio>> {
  const response = await fetch(buildUrl("/api/medconnect/anuncio/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Anuncio>(response, "Nao foi possivel cadastrar anuncio")
}
