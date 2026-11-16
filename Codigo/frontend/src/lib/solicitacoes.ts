import { AuthManager } from "@/lib/AuthManager"

/** Solicitação de credenciamento aguardando análise (visível só para admin). */
export interface SolicitacaoPendente {
  cd_pessoaj: number
  nm_pessoaj: string
  nr_cnpj: string
  cidade?: string | null
  estado?: string | null
}

const EVENTO = "medconnect:solicitacoes-atualizadas"

/** Busca as solicitações PENDENTE. Retorna null se o usuário não tiver acesso. */
export async function buscarSolicitacoesPendentes(): Promise<SolicitacaoPendente[] | null> {
  const token = AuthManager.getInstance().getToken()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  try {
    const res = await fetch(`${apiUrl}/api/medconnect/admin/pessoas/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data)) return null
    return data.filter((e: { status?: string }) => e.status === "PENDENTE")
  } catch {
    return null
  }
}

/** Avisa o menu/sininho que a lista mudou (ex.: após aprovar ou rejeitar). */
export function avisarSolicitacoesAtualizadas() {
  window.dispatchEvent(new Event(EVENTO))
}

export function onSolicitacoesAtualizadas(cb: () => void) {
  window.addEventListener(EVENTO, cb)
  return () => window.removeEventListener(EVENTO, cb)
}
