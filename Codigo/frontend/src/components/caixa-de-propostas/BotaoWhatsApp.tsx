"use client"

import { MessageCircle } from "lucide-react"

import { quantidadeComUnidade } from "@/lib/format/unidade"
import { linkWhatsApp } from "@/lib/whatsapp"
import { Negociacao } from "@/types"

/** Mensagem pronta que a parte envia ao abrir o WhatsApp da outra. */
export function mensagemWhatsApp(n: Negociacao, papel: "vendedor" | "comprador"): string {
  const quantidade = quantidadeComUnidade(Number(n.qtd_proposta || n.anuncio_qtd || 0), n.anuncio_unidade)
  const valor = Number(n.val_proposta || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  return papel === "vendedor"
    ? `Olá! Aqui é do ${n.vendedor_nome}. Aceitei pelo MedConnect a sua proposta #${n.id}: ${n.anuncio_nome}, ${quantidade}, ${valor}. Vamos combinar pagamento, nota fiscal e retirada?`
    : `Olá! Aqui é do ${n.comprador_nome}. Minha proposta #${n.id} no MedConnect foi aceita: ${n.anuncio_nome}, ${quantidade}, ${valor}. Vamos combinar pagamento, nota fiscal e retirada?`
}

type Props = {
  negociacao: Negociacao
  /** Quem está vendo: o vendedor abre o WhatsApp do comprador e vice-versa. */
  papel: "vendedor" | "comprador"
  compacto?: boolean
}

/**
 * Botão "Conversar no WhatsApp" com a outra parte. Só aparece depois do aceite,
 * quando o contato é liberado. Sem telefone no cadastro, mostra um aviso.
 */
export default function BotaoWhatsApp({ negociacao: n, papel, compacto = false }: Props) {
  if (!["A", "F", "N"].includes(n.status)) return null

  const telefone = papel === "vendedor" ? n.comprador_telefone : n.vendedor_telefone
  const link = linkWhatsApp(telefone, mensagemWhatsApp(n, papel))

  if (!link) {
    return (
      <span className="text-xs text-slate-500" onClick={(e) => e.stopPropagation()}>
        {papel === "vendedor" ? "Comprador" : "Vendedor"} sem telefone no cadastro
      </span>
    )
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white transition-colors ${compacto ? "h-9 px-3" : "h-10 px-4"}`}
    >
      <MessageCircle size={16} aria-hidden="true" />
      {compacto ? "WhatsApp" : "Conversar no WhatsApp"}
    </a>
  )
}
