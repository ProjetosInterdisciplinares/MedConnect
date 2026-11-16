"use client"

import { useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import servicesConcluirNegociacao from "@/server/(POST)-negociacao-conclusao"
import BotaoWhatsApp from "@/components/caixa-de-propostas/BotaoWhatsApp"
import { BOTAO, ConfirmarDialog } from "@/components/ui/modal-padrao"
import { Negociacao } from "@/types"

type Props = {
  negociacao: Negociacao
  /** Quem está vendo: o vendedor fala com o comprador e vice-versa. */
  papel: "vendedor" | "comprador"
  onAtualizada: (negociacao: Negociacao) => void
}

const data = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : null)

/**
 * Etapa depois do aceite: contato da outra parte (WhatsApp) e confirmação
 * da entrega/recebimento. O MedConnect não participa da conversa nem do pagamento.
 */
export default function AndamentoNegociacao({ negociacao: n, papel, onAtualizada }: Props) {
  const [enviando, setEnviando] = useState<null | "confirmar" | "nao-concluida">(null)
  const [confirmarNaoConcluida, setConfirmarNaoConcluida] = useState(false)

  const souVendedor = papel === "vendedor"
  const outraParte = souVendedor
    ? { nome: n.comprador_nome, responsavel: n.comprador_responsavel, telefone: n.comprador_telefone, email: n.comprador_email }
    : { nome: n.vendedor_nome, responsavel: n.vendedor_responsavel, telefone: n.vendedor_telefone, email: n.vendedor_email }

  const minhaConfirmacao = souVendedor ? n.entregue_em : n.recebido_em
  const confirmacaoDaOutra = souVendedor ? n.recebido_em : n.entregue_em
  const aberta = n.status === "A"

  async function executar(acao: "confirmar-entrega" | "confirmar-recebimento" | "nao-concluida") {
    setEnviando(acao === "nao-concluida" ? "nao-concluida" : "confirmar")
    const resposta = await servicesConcluirNegociacao(n.id, acao)
    setEnviando(null)
    setConfirmarNaoConcluida(false)
    if ("isError" in resposta) {
      toast.error(resposta.message)
      return
    }
    onAtualizada(resposta)
    if (resposta.status === "F") toast.success("Negociação concluída")
    else if (acao === "nao-concluida") toast("Negociação marcada como não concluída")
    else toast.success(souVendedor ? "Entrega confirmada" : "Recebimento confirmado")
  }

  return (
    <div className="space-y-5">
      {/* Contato */}
      <section aria-labelledby={`contato-${n.id}`}>
        <h3 id={`contato-${n.id}`} className="text-sm font-semibold text-slate-900">
          Contato {souVendedor ? "do comprador" : "do vendedor"}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Combinem pagamento, nota fiscal e retirada diretamente entre as instituições.
        </p>
        <div className="mt-3 rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-slate-900">{outraParte.nome || "—"}</p>
            <p className="text-slate-600">
              {outraParte.responsavel ? `Responsável: ${outraParte.responsavel}` : "Responsável não informado"}
            </p>
            <p className="text-slate-500 tabular-nums">
              {outraParte.telefone || "Telefone não informado"}
              {outraParte.email ? ` · ${outraParte.email}` : ""}
            </p>
          </div>
          <div className="shrink-0">
            <BotaoWhatsApp negociacao={n} papel={papel} />
          </div>
        </div>
      </section>

      {/* Conclusão */}
      <section aria-labelledby={`conclusao-${n.id}`}>
        <h3 id={`conclusao-${n.id}`} className="text-sm font-semibold text-slate-900">Conclusão do negócio</h3>
        <ol className="mt-3 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
          {[
            ["Vendedor confirma a entrega", n.entregue_em],
            ["Comprador confirma o recebimento", n.recebido_em],
          ].map(([rotulo, quando]) => (
            <li key={rotulo as string} className="flex items-center gap-3 px-4 py-2.5">
              {quando
                ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" aria-hidden="true" />
                : <Circle size={16} className="shrink-0 text-slate-300" aria-hidden="true" />}
              <span className="flex-1 text-slate-700">{rotulo}</span>
              <span className="text-xs text-slate-500 tabular-nums">{quando ? data(quando as string) : "Pendente"}</span>
            </li>
          ))}
        </ol>

        {n.status === "F" && <p className="mt-2 text-xs text-emerald-700">Negociação concluída pelas duas partes.</p>}
        {n.status === "N" && <p className="mt-2 text-xs text-slate-500">Esta negociação foi marcada como não concluída.</p>}

        {aberta && (
          <div className="mt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={!!enviando}
              onClick={() => setConfirmarNaoConcluida(true)}
              className={BOTAO.secundario}
            >
              O negócio não aconteceu
            </button>
            {!minhaConfirmacao && (
              <button
                type="button"
                disabled={!!enviando}
                onClick={() => executar(souVendedor ? "confirmar-entrega" : "confirmar-recebimento")}
                className={BOTAO.primario}
              >
                {enviando === "confirmar" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {souVendedor ? "Confirmar entrega" : "Confirmar recebimento"}
              </button>
            )}
          </div>
        )}
        {aberta && minhaConfirmacao && !confirmacaoDaOutra && (
          <p className="mt-2 text-xs text-slate-500 text-right">
            Aguardando {souVendedor ? "o comprador confirmar o recebimento" : "o vendedor confirmar a entrega"}.
          </p>
        )}
      </section>

      <ConfirmarDialog
        open={confirmarNaoConcluida}
        onOpenChange={setConfirmarNaoConcluida}
        titulo="O negócio não aconteceu?"
        mensagem={souVendedor
          ? "A negociação será encerrada como não concluída. Se era o lote inteiro, o anúncio volta para Rascunhos para você revisar e reativar."
          : "A negociação será encerrada como não concluída e o vendedor será avisado."}
        confirmar="Marcar como não concluída"
        variante="perigo"
        carregando={enviando === "nao-concluida"}
        onConfirmar={() => executar("nao-concluida")}
      />
    </div>
  )
}
