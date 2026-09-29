"use client"

import { Anuncio } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesBuscaSemantica(termo: string): Promise<ServiceResult<Anuncio[]>> {
  const response = await fetch(buildUrl("/api/medconnect/busca-semantica/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ termo }),
  })

  return handleResponse<Anuncio[]>(response, "Não foi possível realizar a busca semântica")
}
