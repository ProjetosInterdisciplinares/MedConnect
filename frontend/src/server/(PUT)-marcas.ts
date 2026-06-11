"use client"

import { Marca, UpdateMarcaForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateMarca(pk: number, payload: UpdateMarcaForm): Promise<ServiceResult<Marca>> {
  const response = await fetch(buildUrl(`/api/medconnect/marcas/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Marca>(response, "Nao foi possivel atualizar marca")
}
