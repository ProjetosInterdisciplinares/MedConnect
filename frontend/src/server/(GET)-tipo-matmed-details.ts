"use client"

import { TipoMatMed } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetTipoMatMedDetails(pk: string): Promise<ServiceResult<TipoMatMed>> {
  const response = await fetch(buildUrl(`/api/medconnect/tipo_matmed/${pk}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<TipoMatMed>(response, "Nao foi possivel obter o tipo de material")
}
