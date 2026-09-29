"use client"

import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesRegistrarInteresse(termo: string): Promise<ServiceResult<{ sucesso: boolean; novos_interesses: string }>> {
  const response = await fetch(buildUrl("/api/medconnect/atualizar-interesses/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ termo }),
  })

  return handleResponse<{ sucesso: boolean; novos_interesses: string }>(
    response,
    "Erro silencioso na atualização de perfil"
  )
}
