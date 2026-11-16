/**
 * Link para abrir uma conversa no WhatsApp com a mensagem já escrita.
 * O MedConnect só abre o app da pessoa: a conversa acontece fora da plataforma.
 * Retorna null se o telefone não tiver DDD + número.
 */
export function linkWhatsApp(telefone: string | null | undefined, mensagem: string): string | null {
  let digitos = (telefone || "").replace(/\D/g, "")
  if (digitos.length < 10) return null
  if (!(digitos.startsWith("55") && digitos.length >= 12)) digitos = `55${digitos}` // Brasil
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`
}

export const MOTIVOS_RECUSA = [
  { valor: "VALOR", rotulo: "Valor abaixo do esperado" },
  { valor: "QUANTIDADE", rotulo: "Quantidade não atende" },
  { valor: "NEGOCIADO", rotulo: "Lote já negociado" },
  { valor: "OUTRO", rotulo: "Outro motivo" },
] as const

/** "15/11 às 14:30" */
export function formatarPrazo(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
}
