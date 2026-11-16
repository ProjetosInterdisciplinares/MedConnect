"use client"

import { NotificacoesResponse } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetNotificacoes(): Promise<ServiceResult<NotificacoesResponse>> {
  const response = await fetch(buildUrl("/api/medconnect/notificacoes/"), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  })

  return handleResponse<NotificacoesResponse>(response, "Não foi possível carregar as notificações")
}
