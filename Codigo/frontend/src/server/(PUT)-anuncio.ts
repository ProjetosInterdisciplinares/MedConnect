"use client"

import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"
import { UpdateAnuncioForm } from "@/types/anuncio"

export default async function servicesUpdateAnuncio(id: number, form: UpdateAnuncioForm): Promise<ServiceResult<any>> {
  const response = await fetch(buildUrl(`/api/medconnect/anuncio/${id}/`), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(form)
  })

  return handleResponse<any>(response, "Não foi possível atualizar o anúncio")
}
