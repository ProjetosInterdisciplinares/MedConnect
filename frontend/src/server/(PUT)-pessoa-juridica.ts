"use client"

import { PessoaJuridica, UpdatePessoaJuridicaForm } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesUpdatePessoaJuridica(pk: number, payload: UpdatePessoaJuridicaForm): Promise<ServiceResult<PessoaJuridica>> {
  const response = await fetch(buildUrl(`/api/medconnect/pessoa_juridica/${pk}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  return handleResponse<PessoaJuridica>(response, "Nao foi possivel atualizar pessoa juridica")
}
