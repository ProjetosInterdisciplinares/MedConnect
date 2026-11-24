"use client"

import { AnaliseEstoque } from "@/types"
import { AuthManager } from "@/lib/AuthManager"
import { buildUrl, handleResponse, ServiceResult } from "@/server/middleware"

/** Envia a planilha de movimentação (multipart) e devolve a análise já salva no histórico. */
export default async function servicesAnalisarEstoque(arquivo: File, horizonteDias: number): Promise<ServiceResult<AnaliseEstoque>> {
  const token = AuthManager.getInstance().getToken()
  const dados = new FormData()
  dados.append("file", arquivo)
  dados.append("horizonte_dias", String(horizonteDias))

  try {
    const response = await fetch(buildUrl("/api/medconnect/estoque-ia/analisar/"), {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: dados,
    })
    return handleResponse<AnaliseEstoque>(response, "Não foi possível analisar a planilha")
  } catch {
    return { isError: true, status: 0, message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." }
  }
}
