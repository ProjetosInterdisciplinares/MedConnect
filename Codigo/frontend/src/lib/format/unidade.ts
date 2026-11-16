/** Unidades de medida mais usadas, sugeridas no cadastro de insumo. */
export const UNIDADES_COMUNS = [
  "Unidade",
  "Caixa c/ 10",
  "Caixa c/ 20",
  "Caixa c/ 50",
  "Caixa c/ 100",
  "Pacote c/ 10",
  "Pacote c/ 100",
  "Frasco",
  "Frasco-ampola",
  "Ampola",
  "Bolsa",
  "Comprimido",
  "Cápsula",
  "Blister",
  "Tubo",
  "Rolo",
  "Par",
  "Kit",
  "Seringa",
  "Litro",
]

const PLURAIS: Record<string, string> = {
  caixa: "caixas",
  frasco: "frascos",
  unidade: "unidades",
  pacote: "pacotes",
  ampola: "ampolas",
  rolo: "rolos",
  "frasco-ampola": "frascos-ampola",
}

/**
 * Unidade de venda a partir do cadastro do insumo.
 * Ex.: "Caixa c/ 100" → { singular: "caixa", plural: "caixas" }.
 */
export function unidadeDeVenda(unidadeMed?: string | null) {
  const base = (unidadeMed || "").trim().toLowerCase().split(/\s+c\/|\s+com\s|\(/)[0].trim() || "unidade"
  return { singular: base, plural: PLURAIS[base] ?? `${base}s` }
}

/** "20 caixas", "1 frasco" */
export function quantidadeComUnidade(qtd: number, unidadeMed?: string | null) {
  const u = unidadeDeVenda(unidadeMed)
  return `${qtd.toLocaleString("pt-BR")} ${qtd === 1 ? u.singular : u.plural}`
}
