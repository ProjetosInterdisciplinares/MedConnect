/**
 * Unidades de medida aceitas no cadastro de insumo: só a unidade, sem quantidade
 * (ex.: "Caixa", e não "Caixa c/ 100"). Manter igual a UNIDADES_MEDIDA em backend/mat_med/models.py.
 */
export const UNIDADES_MEDIDA = [
  "Unidade", "Caixa", "Pacote", "Frasco", "Frasco-ampola", "Ampola", "Bolsa",
  "Comprimido", "Cápsula", "Blister", "Envelope", "Bisnaga", "Tubo", "Rolo",
  "Par", "Kit", "Seringa", "Galão", "Litro", "Mililitro", "Grama", "Quilograma",
] as const

const PLURAIS: Record<string, string> = {
  caixa: "caixas",
  frasco: "frascos",
  unidade: "unidades",
  pacote: "pacotes",
  ampola: "ampolas",
  rolo: "rolos",
  "frasco-ampola": "frascos-ampola",
  par: "pares",
  "galão": "galões",
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
