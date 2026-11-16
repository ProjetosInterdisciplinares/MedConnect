"use client"

import { useEffect, useState } from "react"
import { Barcode, CreditCard, Loader2, QrCode } from "lucide-react"
import { toast } from "sonner"
import { ComprarCreditosResponse, MetodoPagamento, PacoteCredito } from "@/types"
import servicesPostComprarCreditos from "@/server/(POST)-comprar-creditos"
import { formatBRL, formatCreditos } from "@/lib/creditos"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

const METODOS: { id: MetodoPagamento; nome: string; detalhe: string; icon: typeof QrCode }[] = [
  { id: "PIX", nome: "PIX", detalhe: "Aprovação imediata", icon: QrCode },
  { id: "CARTAO", nome: "Cartão de crédito", detalhe: "Visa, Mastercard, Elo", icon: CreditCard },
  { id: "BOLETO", nome: "Boleto bancário", detalhe: "Compensação em até 2 dias úteis", icon: Barcode },
]

type Etapa = "pagamento" | "processando" | "sucesso"

interface Props {
  pacote: PacoteCredito | null
  saldoAtual: number
  onClose: () => void
  onSuccess: (resposta: ComprarCreditosResponse) => void
}

const BTN_PRIMARIO = "h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-70 cursor-pointer"
const BTN_SECUNDARIO = "h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 cursor-pointer"

export default function CheckoutDialog({ pacote, saldoAtual, onClose, onSuccess }: Props) {
  const [metodo, setMetodo] = useState<MetodoPagamento>("PIX")
  const [etapa, setEtapa] = useState<Etapa>("pagamento")
  const [resultado, setResultado] = useState<ComprarCreditosResponse | null>(null)

  // Reinicia o fluxo a cada pacote aberto
  useEffect(() => {
    if (pacote) {
      setEtapa("pagamento")
      setMetodo("PIX")
      setResultado(null)
    }
  }, [pacote])

  async function confirmar() {
    if (!pacote) return
    setEtapa("processando")
    const [res] = await Promise.all([
      servicesPostComprarCreditos({ pacote_id: pacote.id, metodo_pagamento: metodo }),
      new Promise((r) => setTimeout(r, 900)),
    ])
    if ("isError" in res) {
      toast.error("Não foi possível concluir a compra", { description: res.message })
      setEtapa("pagamento")
      return
    }
    setResultado(res)
    setEtapa("sucesso")
    onSuccess(res)
  }

  const processando = etapa === "processando"

  return (
    <Dialog open={pacote !== null} onOpenChange={(open) => { if (!open && !processando) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[460px] p-6 gap-0 bg-white">
        {pacote && etapa !== "sucesso" && (
          <>
            <DialogTitle className="text-lg font-semibold text-slate-900">Comprar pacote {pacote.nome}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">
              Pagamento único. Os créditos entram no saldo assim que o pagamento é aprovado.
            </DialogDescription>

            <dl className="mt-5 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
              {[
                ["Créditos", `${formatCreditos(pacote.total_creditos)}${pacote.bonus_creditos > 0 ? ` (inclui ${formatCreditos(pacote.bonus_creditos)} de bônus)` : ""}`],
                ["Saldo após a compra", `${formatCreditos(saldoAtual + pacote.total_creditos)} créditos`],
                ["Total", formatBRL(pacote.preco)],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500">{rotulo}</dt>
                  <dd className={`text-right tabular-nums ${rotulo === "Total" ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>{valor}</dd>
                </div>
              ))}
            </dl>

            <fieldset disabled={processando} className="mt-5">
              <legend className="text-sm font-medium text-slate-700 mb-2">Forma de pagamento</legend>
              <div className="grid gap-2">
                {METODOS.map((m) => {
                  const Icon = m.icon
                  const ativo = metodo === m.id
                  return (
                    <label
                      key={m.id}
                      htmlFor={`metodo-${m.id}`}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors
                        ${ativo ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <input
                        type="radio"
                        id={`metodo-${m.id}`}
                        name="metodo_pagamento"
                        value={m.id}
                        checked={ativo}
                        onChange={() => setMetodo(m.id)}
                        className="accent-blue-700"
                      />
                      <Icon size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{m.nome}</span>
                        <span className="block text-xs text-slate-500">{m.detalhe}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <p className="mt-4 text-xs text-slate-500">
              Ambiente de demonstração: o pagamento é simulado e aprovado automaticamente.
            </p>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onClose} disabled={processando} className={BTN_SECUNDARIO}>Cancelar</button>
              <button type="button" id="checkout-confirmar" onClick={confirmar} disabled={processando} className={BTN_PRIMARIO}>
                {processando
                  ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Processando…</>
                  : `Pagar ${formatBRL(pacote.preco)}`}
              </button>
            </div>
          </>
        )}

        {etapa === "sucesso" && resultado && (
          <>
            <DialogTitle className="text-lg font-semibold text-slate-900">Compra aprovada</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-600">{resultado.mensagem}</DialogDescription>
            <dl className="mt-5 rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-slate-500">Novo saldo</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">{formatCreditos(resultado.saldo)} créditos</dd>
              </div>
              {resultado.transacao.codigo_pagamento && (
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-slate-500 shrink-0">Comprovante</dt>
                  <dd className="font-medium text-slate-800 tabular-nums break-all text-right">{resultado.transacao.codigo_pagamento}</dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex justify-end">
              <button type="button" id="checkout-concluir" onClick={onClose} className={BTN_PRIMARIO}>Concluir</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
