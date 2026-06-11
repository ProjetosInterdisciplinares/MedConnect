"use client"

import { CreateMarcaForm, Marca } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreateMarca(payload: CreateMarcaForm): Promise<ServiceResult<Marca>> {
  const response = await fetch(buildUrl("/api/medconnect/marcas/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Marca>(response, "Nao foi possivel cadastrar marca")
}
