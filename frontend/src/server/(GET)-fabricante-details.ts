"use client"

import { Fabricante } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetFabricanteDetails(pk: number): Promise<ServiceResult<Fabricante>> {
  const response = await fetch(buildUrl(`/api/medconnect/fabricante/${pk}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<Fabricante>(response, "Nao foi possivel obter o fabricante")
}
