"use client"

import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesDeleteAnaliseEstoque(id: number): Promise<ServiceResult<Record<string, never>>> {
  const response = await fetch(buildUrl(`/api/medconnect/estoque-ia/analises/${id}/`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  })
  return handleResponse<Record<string, never>>(response, "Não foi possível excluir a análise")
}
