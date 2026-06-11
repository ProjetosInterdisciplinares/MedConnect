"use client"

import { PessoaJuridica } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetPessoaJuridicaDetails(pk: number): Promise<ServiceResult<PessoaJuridica>> {
  const response = await fetch(buildUrl(`/api/medconnect/pessoa_juridica/${pk}`), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<PessoaJuridica>(response, "Nao foi possivel obter a pessoa juridica")
}
