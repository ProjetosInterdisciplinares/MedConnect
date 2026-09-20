"use client"

import { MatMed } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetMatMed(): Promise<ServiceResult<MatMed[]>> {
  const response = await fetch(buildUrl("/api/medconnect/mat_med/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<MatMed[]>(response, "Nao foi possivel listar insumos")
}
