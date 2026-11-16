"use client"

import { AlertaInteresse } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetAlertas(): Promise<ServiceResult<AlertaInteresse[]>> {
  const response = await fetch(buildUrl("/api/medconnect/alertas/"), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  })

  return handleResponse<AlertaInteresse[]>(response, "Não foi possível carregar os alertas")
}
