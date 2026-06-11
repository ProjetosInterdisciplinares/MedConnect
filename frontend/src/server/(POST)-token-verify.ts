"use client"

import { TokenVerifyRequest } from "@/types"
import { buildUrl, getJsonHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesTokenVerify(payload: TokenVerifyRequest): Promise<ServiceResult<Record<string, never>>> {
  const response = await fetch(buildUrl("/authentication/token/verify/"), {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Record<string, never>>(response, "Nao foi possivel validar token")
}