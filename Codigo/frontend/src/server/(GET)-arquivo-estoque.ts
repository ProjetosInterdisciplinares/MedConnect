"use client"

import { AuthManager } from "@/lib/AuthManager"
import { buildUrl } from "@/server/middleware"

/**
 * Baixa uma planilha da análise de estoque (modelo, exemplo ou relatório).
 * Devolve uma mensagem de erro, ou null quando o download começou.
 */
export default async function servicesBaixarArquivoEstoque(caminho: string, nomePadrao: string): Promise<string | null> {
  try {
    const token = AuthManager.getInstance().getToken()
    const response = await fetch(buildUrl(`/api/medconnect/estoque-ia/${caminho}`), {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
    if (!response.ok) return "O servidor não conseguiu gerar o arquivo. Tente novamente."

    const nome = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || nomePadrao
    const url = window.URL.createObjectURL(await response.blob())
    const link = document.createElement("a")
    link.href = url
    link.download = nome
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return null
  } catch {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
  }
}
