"use client"

import { Anuncio, UpdateAnuncioForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdateAnuncio(nrAnuncio: number, payload: UpdateAnuncioForm): Promise<ServiceResult<Anuncio>> {
  const response = await fetch(buildUrl(`/api/medconnect/anuncio/${nrAnuncio}/`), {
    method: "PATCH", //Precisa ser patch pois ao alterar o status aceitar/recusar proposta, não será enviado o restante dos dados do anúncio
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<Anuncio>(response, "Nao foi possivel atualizar anuncio")
}
