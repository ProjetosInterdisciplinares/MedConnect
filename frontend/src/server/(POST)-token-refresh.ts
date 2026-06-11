"use client"

import { TokenRefreshRequest, TokenRefreshResponse } from "@/types"
import { buildUrl, getJsonHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesTokenRefresh(payload: TokenRefreshRequest): Promise<ServiceResult<TokenRefreshResponse>> {
  const response = await fetch(buildUrl("/authentication/token/refresh/"), {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<TokenRefreshResponse>(response, "Nao foi possivel atualizar token")
}
