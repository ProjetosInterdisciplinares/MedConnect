"use client"

import { Marca } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetMarcaDetails(pk: number): Promise<ServiceResult<Marca>> {
  const response = await fetch(buildUrl(`/api/medconnect/marcas/${pk}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Marca>(response, "Nao foi possivel obter a marca")
}
