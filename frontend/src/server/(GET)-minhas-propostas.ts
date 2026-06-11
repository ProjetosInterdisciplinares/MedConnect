"use client"

import { Anuncio } from "@/types"
import {
  buildUrl,
  getAuthHeaders,
  handleResponse,
  ServiceResult,
} from "@/server/middleware"

export default async function servicesGetMinhasPropostas():
  Promise<ServiceResult<Anuncio[]>> {

  const response = await fetch(
    buildUrl("/api/medconnect/anuncio/minhas-propostas/"),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  )

  return handleResponse<Anuncio[]>(
    response,
    "Não foi possível obter propostas"
  )
}
