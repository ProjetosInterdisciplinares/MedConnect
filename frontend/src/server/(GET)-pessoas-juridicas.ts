"use client"

import { PessoaJuridica } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

export default async function servicesGetPessoasJuridicas(): Promise<ServiceResult<PessoaJuridica[]>> {
  const response = await fetch(buildUrl("/api/medconnect/pessoa_juridica/"), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return handleResponse<PessoaJuridica[]>(response, "Nao foi possivel listar pessoas juridicas")
}
