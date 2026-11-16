"use client"

import { Notificacao } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

/** Marca uma notificação como lida. */
export async function servicesMarcarNotificacaoLida(id: number): Promise<ServiceResult<Notificacao>> {
  const response = await fetch(buildUrl(`/api/medconnect/notificacoes/${id}/lida/`), {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleResponse<Notificacao>(response, "Não foi possível atualizar a notificação")
}

/** Marca todas as notificações da empresa como lidas. */
export default async function servicesMarcarTodasLidas(): Promise<ServiceResult<{ marcadas: number }>> {
  const response = await fetch(buildUrl("/api/medconnect/notificacoes/lidas/"), {
    method: "POST",
    headers: getAuthHeaders(),
  })

  return handleResponse<{ marcadas: number }>(response, "Não foi possível atualizar as notificações")
}
