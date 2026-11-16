"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"

import servicesGetVerificacaoCredenciamento from "@/server/(GET)-verificacao-credenciamento"
import servicesAtualizarVerificacaoCredenciamento from "@/server/(POST)-verificacao-credenciamento"
import { ItemVerificacao, VerificacaoCredenciamento } from "@/types"

const ICONE = {
  ok: { Icone: CheckCircle2, cor: "text-emerald-600" },
  alerta: { Icone: AlertTriangle, cor: "text-amber-600" },
  erro: { Icone: XCircle, cor: "text-red-600" },
} as const

const RESUMO = {
  ok: { texto: "Os dados conferem com a Receita Federal.", classe: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  alerta: { texto: "Há divergências para conferir antes de aprovar.", classe: "bg-amber-50 text-amber-900 border-amber-200" },
  erro: { texto: "Há problemas no CNPJ. Confira antes de aprovar.", classe: "bg-red-50 text-red-800 border-red-200" },
} as const

function Linha({ item }: { item: ItemVerificacao }) {
  const { Icone, cor } = ICONE[item.situacao] ?? ICONE.alerta
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <Icone size={16} className={`mt-0.5 shrink-0 ${cor}`} aria-label={item.situacao} />
      <div className="min-w-0 text-sm">
        <p className="font-medium text-slate-900">{item.rotulo}</p>
        <p className="text-slate-600 break-words">{item.detalhe}</p>
      </div>
    </li>
  )
}

/**
 * Painel do admin: compara o cadastro da empresa com os dados oficiais do CNPJ
 * na Receita Federal. É uma ajuda para decidir; a aprovação continua manual.
 */
export default function VerificacaoCNPJ({ empresaId }: { empresaId: number }) {
  const [relatorio, setRelatorio] = useState<VerificacaoCredenciamento | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    servicesGetVerificacaoCredenciamento(empresaId).then((resposta) => {
      if (!ativo) return
      if ("isError" in resposta) setErro(resposta.message)
      else setRelatorio(resposta)
      setCarregando(false)
    })
    return () => { ativo = false }
  }, [empresaId])

  async function consultarDeNovo() {
    setAtualizando(true)
    const resposta = await servicesAtualizarVerificacaoCredenciamento(empresaId)
    setAtualizando(false)
    if ("isError" in resposta) setErro(resposta.message)
    else {
      setErro(null)
      setRelatorio(resposta)
    }
  }

  return (
    <section aria-labelledby="verificacao-cnpj" className="mt-5 pt-5 border-t border-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="verificacao-cnpj" className="text-sm font-semibold text-slate-900">Verificação do CNPJ</h3>
          <p className="text-xs text-slate-500">Dados oficiais da Receita Federal, para conferir antes de aprovar.</p>
        </div>
        {!carregando && (
          <button
            type="button"
            onClick={consultarDeNovo}
            disabled={atualizando}
            className="h-8 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {atualizando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
            Consultar de novo
          </button>
        )}
      </div>

      {carregando ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Consultando a Receita Federal…
        </p>
      ) : erro && !relatorio ? (
        <p className="mt-3 text-sm text-red-700">{erro}</p>
      ) : relatorio && (
        <>
          <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-medium ${RESUMO[relatorio.resultado].classe}`}>
            {RESUMO[relatorio.resultado].texto}
          </p>
          {relatorio.aviso && <p className="mt-2 text-xs text-amber-700">{relatorio.aviso}</p>}

          <ul className="mt-3 rounded-lg border border-slate-200 divide-y divide-slate-100">
            {relatorio.itens.map((item) => <Linha key={item.chave} item={item} />)}
          </ul>

          {relatorio.dados_receita && (
            <p className="mt-2 text-xs text-slate-500">
              {relatorio.dados_receita.nome_fantasia && `Nome fantasia: ${relatorio.dados_receita.nome_fantasia} · `}
              {relatorio.dados_receita.data_abertura && `Aberta em ${new Date(relatorio.dados_receita.data_abertura + "T00:00:00").toLocaleDateString("pt-BR")} · `}
              {relatorio.consultado_em && `Consultado em ${new Date(relatorio.consultado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}
            </p>
          )}
        </>
      )}
    </section>
  )
}
