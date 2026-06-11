
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