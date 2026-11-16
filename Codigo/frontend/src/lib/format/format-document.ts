
export function formatCNPJ(cnpj: string): string {
  // Remove all non-numeric characters
  const cleaned = cnpj.replace(/\D/g, "")

  // Format the CNPJ
  const formatted = cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  )

  return formatted
}

/** Máscara progressiva de telefone: (11) 1234-5678 ou (11) 91234-5678. */
export function formatTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Número do endereço: só dígitos (até 6) ou "S/N" para sem número. */
export function formatNumeroEndereco(valor: string): string {
  if (/^\s*s/i.test(valor)) return "S/N"
  return valor.replace(/\D/g, "").slice(0, 6)
}