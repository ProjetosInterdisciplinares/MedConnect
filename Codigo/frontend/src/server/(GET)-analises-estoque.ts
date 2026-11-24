"use client"

import { AnaliseEstoque, ResumoAnaliseEstoque } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceResult } from "@/server/middleware"

/** Histórico de análises de estoque da instituição (sem os itens). */
export default async function servicesGetAnalisesEstoque(): Promise<ServiceResult<ResumoAnaliseEstoque[]>> {
  const response = await fetch(buildUrl("/api/medconnect/estoque-ia/analises/"), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  })
  return handleResponse<ResumoAnaliseEstoque[]>(response, "Não foi possível carregar o histórico de análises")
}

/** Uma análise salva, com todos os itens. */
export async function servicesGetAnaliseEstoque(id: number): Promise<ServiceResult<AnaliseEstoque>> {
  const response = await fetch(buildUrl(`/api/medconnect/estoque-ia/analises/${id}/`), {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  })
  return handleResponse<AnaliseEstoque>(response, "Não foi possível abrir a análise")
}
