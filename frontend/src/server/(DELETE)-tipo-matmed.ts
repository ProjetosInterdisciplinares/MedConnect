"use client"

import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesDeleteTipoMatMed(pk: string): Promise<ServiceResult<Record<string, never>>> {
  const response = await fetch(buildUrl(`/api/medconnect/tipo_matmed/${pk}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  return handleResponse<Record<string, never>>(response, "Nao foi possivel remover tipo de material")
}