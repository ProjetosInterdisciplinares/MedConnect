"use client"

import { PrecoReferencia } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesPostPrecoReferencia(cdMat: number): Promise<ServiceResult<PrecoReferencia>> {
  const response = await fetch(buildUrl("/api/medconnect/preco-referencia/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ cd_mat: cdMat }),
  })

  return handleResponse<PrecoReferencia>(response, "Não foi possível consultar o preço de referência")
}
