"use client"

import { CreatePessoaJuridicaForm, PessoaJuridica } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesCreatePessoaJuridica(payload: CreatePessoaJuridicaForm): Promise<ServiceResult<PessoaJuridica>> {
  const response = await fetch(buildUrl("/api/medconnect/pessoa_juridica/"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<PessoaJuridica>(response, "Nao foi possivel cadastrar pessoa juridica")
}
