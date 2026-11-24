"use client"

import { PublicacaoSugestao, PublicarSugestoesResposta } from "@/types"
import { buildUrl, getAuthHeaders, handleResponse, ServiceError } from "@/server/middleware"

export type ErroPublicacaoSugestoes = ServiceError & { detalhes?: { index: number; erros: string[] }[] }

/**
 * Publica os anúncios configurados a partir das sugestões de uma análise de estoque.
 * Insumos que ainda não existem são cadastrados na hora. Em erro de validação,
 * `detalhes` traz os erros de cada anúncio (índice na lista enviada).
 */
export default async function servicesPublicarSugestoes(
  analiseId: number,
  itens: PublicacaoSugestao[],
): Promise<PublicarSugestoesResposta | ErroPublicacaoSugestoes> {
  let response: Response
  try {
    response = await fetch(buildUrl(`/api/medconnect/estoque-ia/analises/${analiseId}/publicar/`), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(itens),
    })
  } catch {
    return { isError: true, status: 0, message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." }
  }
  if (response.status === 400) {
    const corpo = await response.json().catch(() => ({}))
    return { isError: true, status: 400, message: corpo.erro || "Há anúncios com dados inválidos.", detalhes: corpo.detalhes }
  }
  return handleResponse<PublicarSugestoesResposta>(response, "Não foi possível publicar os anúncios")
}
