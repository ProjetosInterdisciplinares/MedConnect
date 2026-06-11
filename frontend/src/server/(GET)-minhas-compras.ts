"use client"

import { Anuncio } from "@/types"
import {
  buildUrl,
  getAuthHeaders,
  handleResponse,
  ServiceResult
} from "@/server/middleware"

export default async function servicesGetMinhasCompras():
  Promise<ServiceResult<Anuncio[]>> {

  const response = await fetch(
    buildUrl("/api/medconnect/anuncio/minhas-compras/"),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  )

  return handleResponse<Anuncio[]>(
    response,
    "Não foi possível obter minhas compras"
  )
}