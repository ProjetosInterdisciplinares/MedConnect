"use client"

import { AlertaInteresse } from "@/types"
import { buildUrl, getAuthHeaders, ServiceResult } from "@/server/middleware"

/** Cria um alerta "me avise quando aparecer um anúncio de ...". */
export default async function servicesCreateAlerta(termo: string): Promise<ServiceResult<AlertaInteresse>> {
  const response = await fetch(buildUrl("/api/medconnect/alertas/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ termo }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const mensagem = Array.isArray(data?.termo) ? data.termo[0] : data?.erro || data?.detail
    return { isError: true, status: response.status, message: mensagem || "Não foi possível criar o alerta" }
  }
  return data as AlertaInteresse
}
