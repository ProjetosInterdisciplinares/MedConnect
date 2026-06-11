"use client"

import { TipoMatMed } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetTipoMatMed(): Promise<ServiceResult<TipoMatMed[]>> {
  const response = await fetch(buildUrl("/api/medconnect/tipo_matmed/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<TipoMatMed[]>(response, "Nao foi possivel listar tipos de material")
}
