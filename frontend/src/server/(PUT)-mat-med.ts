"use client"

import { MatMed, UpdateMatMedForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateMatMed(pk: number, payload: UpdateMatMedForm): Promise<ServiceResult<MatMed>> {
  const response = await fetch(buildUrl(`/api/medconnect/mat_med/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<MatMed>(response, "Nao foi possivel atualizar insumo")
}
