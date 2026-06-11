"use client"

import { CreateTipoMatMedForm, TipoMatMed } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreateTipoMatMed(payload: CreateTipoMatMedForm): Promise<ServiceResult<TipoMatMed>> {
  const response = await fetch(buildUrl("/api/medconnect/tipo_matmed/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<TipoMatMed>(response, "Nao foi possivel cadastrar tipo de material")
}
