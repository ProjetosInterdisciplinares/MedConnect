"use client"

import { PessoaJuridica } from "@/types"
import {
  buildUrl,
  getAuthHeaders,
  handleResponse,
  ServiceResult,
} from "@/server/middleware"

export default async function servicesGetMinhaPessoaJuridica():
  Promise<ServiceResult<PessoaJuridica>> {

  const response = await fetch(
    buildUrl("/api/medconnect/pessoa_juridica/me/"),
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  )

  return handleResponse<PessoaJuridica>(
    response,
    "Não foi possível carregar o perfil"
  )
}