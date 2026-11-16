"use client"

import { SugestaoCatmat } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetCatmatSugestoes(termo: string, categoria?: string): Promise<ServiceResult<SugestaoCatmat[]>> {
  const params = new URLSearchParams({ q: termo })
  if (categoria) params.set("categoria", categoria)

  const response = await fetch(buildUrl(`/api/medconnect/catmat/sugestoes/?${params}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<SugestaoCatmat[]>(response, "Não foi possível buscar sugestões de CATMAT")
}
