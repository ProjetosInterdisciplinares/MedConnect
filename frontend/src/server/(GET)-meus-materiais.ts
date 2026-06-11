"use client"

import { MatMed } from "@/types"
import {
  buildUrl,
  getAuthHeaders,
  handleResponse,
  ServiceResult
} from "@/server/middleware"

export default async function servicesGetMeusMateriais():
  Promise<ServiceResult<MatMed[]>> {

  const response = await fetch(
    buildUrl("/api/medconnect/mat_med/meus-materiais/"),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  )

  return handleResponse<MatMed[]>(
    response,
    "Não foi possível listar seus materiais"
  )
}