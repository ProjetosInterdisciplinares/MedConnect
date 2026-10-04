"use client"

import { useEffect, useState } from "react"
import { Barcode, CheckCircle2, CreditCard, Info, Loader2, Lock, QrCode } from "lucide-react"
import { toast } from "sonner"
import { ComprarCreditosResponse, MetodoPagamento, PacoteCredito } from "@/types"
import servicesPostComprarCreditos from "@/server/(POST)-comprar-creditos"
import CreditoCoin from "@/components/creditos/CreditoCoin"
import { formatBRL, formatCreditos } from "@/lib/creditos"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const METODOS: { id: MetodoPagamento; nome: string; detalhe: string; icon: typeof QrCode }[] = [
  { id: "PIX", nome: "PIX", detalhe: "Aprovação instantânea", icon: QrCode },
  { id: "CARTAO", nome: "Cartão de crédito", detalhe: "Visa, Master, Elo", icon: CreditCard },
  { id: "BOLETO", nome: "Boleto bancário", detalhe: "Até 2 dias úteis", icon: Barcode },
]

type Etapa = "pagamento" | "processando" | "sucesso"

interface Props {
  pacote: PacoteCredito | null
  saldoAtual: number
  onClose: () => void
  onSuccess: (resposta: ComprarCreditosResponse) => void
}

export default function CheckoutDialog({ pacote, saldoAtual, onClose, onSuccess }: Props) {
  const [metodo, setMetodo] = useState<MetodoPagamento>("PIX")
  const [etapa, setEtapa] = useState<Etapa>("pagamento")
  const [resultado, setResultado] = useState<ComprarCreditosResponse | null>(null)

  // Reseta o fluxo sempre que um novo pacote é aberto
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
      new Promise((r) => setTimeout(r, 1200)), // dá tempo da animação respirar
    ])

    if ("isError" in res) {
      toast.error(res.message)
      setEtapa("pagamento")
      return
    }

    setResultado(res)
    setEtapa("sucesso")
    onSuccess(res)
  }

  const aberto = pacote !== null

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!open && etapa !== "processando") onClose()
      }}
    >
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden" showCloseButton={etapa !== "processando"}>
        {pacote && etapa !== "sucesso" && (
          <>
            <DialogHeader className="m-0 rounded-none p-6 pb-5" style={{ background: "linear-gradient(140deg, #172554, #1d4ed8)" }}>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                <Lock className="w-4 h-4" /> Finalizar compra
              </DialogTitle>
              <DialogDescription>Revise o pacote e escolha a forma de pagamento.</DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Resumo */}
              <div className="flex items-center gap-4 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4">
                <CreditoCoin size={48} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700/80">Pacote {pacote.nome}</p>
                  <p className="text-xl font-black text-slate-900 tabular-nums">
                    {formatCreditos(pacote.total_creditos)} créditos
                  </p>
                  {pacote.bonus_creditos > 0 && (
                    <p className="text-xs font-semibold text-violet-600">inclui {formatCreditos(pacote.bonus_creditos)} de bônus</p>
                  )}
                </div>
                <p className="text-lg font-black text-slate-900 whitespace-nowrap">{formatBRL(pacote.preco)}</p>
              </div>

              {/* Métodos */}
              <fieldset disabled={etapa === "processando"}>
                <legend className="text-sm font-bold text-slate-700 mb-2.5">Forma de pagamento</legend>
                <div className="grid gap-2">
                  {METODOS.map((m) => {
                    const Icon = m.icon
                    const ativo = metodo === m.id
                    return (
                      <label
                        key={m.id}
                        htmlFor={`metodo-${m.id}`}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all duration-200
                          ${ativo ? "border-blue-600 bg-blue-50/60 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                      >
                        <input
                          type="radio"
                          id={`metodo-${m.id}`}
                          name="metodo_pagamento"
                          value={m.id}
                          checked={ativo}
                          onChange={() => setMetodo(m.id)}
                          className="sr-only"
                        />
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${ativo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <Icon size={18} />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-bold text-slate-800">{m.nome}</span>
                          <span className="block text-xs text-slate-400 font-medium">{m.detalhe}</span>
                        </span>
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${ativo ? "border-blue-600" : "border-slate-300"}`}>
                          <span className={`w-2.5 h-2.5 rounded-full bg-blue-600 transition-transform ${ativo ? "scale-100" : "scale-0"}`} />
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
                <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
                <span>
                  Ambiente de demonstração: o pagamento é <strong className="text-slate-700">simulado</strong> e aprovado automaticamente.
                </span>
              </div>

              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-slate-500 font-medium">Saldo após a compra</span>
                <span className="font-extrabold text-slate-900 tabular-nums flex items-center gap-1.5">
                  <CreditoCoin size={16} /> {formatCreditos(saldoAtual + pacote.total_creditos)}
                </span>
              </div>

              <button
                type="button"
                id="checkout-confirmar"
                onClick={confirmar}
                disabled={etapa === "processando"}
                className="credit-shine w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold text-white transition-all active:scale-[0.98] disabled:opacity-80 cursor-pointer"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 10px 24px -8px rgba(37,99,235,0.6)" }}
              >
                {etapa === "processando" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processando pagamento...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pagar {formatBRL(pacote.preco)}</>
                )}
              </button>
            </div>
          </>
        )}

        {etapa === "sucesso" && resultado && (
          <div className="relative p-8 text-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-100/70 to-transparent" />
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-amber-300/40 animate-ping" />
              <CreditoCoin size={88} className="relative animate-credit-pop drop-shadow-[0_8px_20px_rgba(245,158,11,0.5)]" />
            </div>
            <DialogTitle className="relative mt-6 text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Compra aprovada!
            </DialogTitle>
            <DialogDescription className="relative mt-2 text-slate-500">
              {resultado.mensagem}
            </DialogDescription>

            <div className="relative mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-3 text-left">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Novo saldo</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{formatCreditos(resultado.saldo)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comprovante</p>
                <p className="text-xs font-mono font-bold text-slate-600 mt-1.5 break-all">{resultado.transacao.codigo_pagamento}</p>
              </div>
            </div>

            <button
              type="button"
              id="checkout-concluir"
              onClick={onClose}
              className="relative mt-6 w-full rounded-xl py-3 text-sm font-extrabold text-white cursor-pointer transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #172554, #1d4ed8)" }}
            >
              Continuar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
