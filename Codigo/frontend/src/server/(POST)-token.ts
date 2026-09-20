"use client"

import { TokenObtainPairRequest, TokenObtainPairResponse } from "@/types"
import { buildUrl, getJsonHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesTokenObtain(payload: TokenObtainPairRequest): Promise<ServiceResult<TokenObtainPairResponse>> {
  const response = await fetch(buildUrl("/authentication/token/"), {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<TokenObtainPairResponse>(response, "Nao foi possivel obter token")
}
