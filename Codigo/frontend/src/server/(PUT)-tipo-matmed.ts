"use client"

import { TipoMatMed, UpdateTipoMatMedForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateTipoMatMed(pk: string, payload: UpdateTipoMatMedForm): Promise<ServiceResult<TipoMatMed>> {
  const response = await fetch(buildUrl(`/api/medconnect/tipo_matmed/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<TipoMatMed>(response, "Nao foi possivel atualizar tipo de material")
}
