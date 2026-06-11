"use client"

import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesDeleteFabricante(pk: number): Promise<ServiceResult<Record<string, never>>> {
  const response = await fetch(buildUrl(`/api/medconnect/fabricante/${pk}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return handleResponse<Record<string, never>>(response, "Nao foi possivel remover fabricante")
}
