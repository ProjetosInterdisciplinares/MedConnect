"use client"

import { Fabricante, UpdateFabricanteForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateFabricante(pk: number, payload: UpdateFabricanteForm): Promise<ServiceResult<Fabricante>> {
  const response = await fetch(buildUrl(`/api/medconnect/fabricante/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Fabricante>(response, "Nao foi possivel atualizar fabricante")
}
