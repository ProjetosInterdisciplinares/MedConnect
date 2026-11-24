import { PerfilEstoque, PrioridadeEstoque, SinalEstoque } from "@/types"

/** Rótulos, cores e formatação da análise de estoque. */

type Rotulo = { rotulo: string; explicacao: string }

export const PERFIS: Record<PerfilEstoque, Rotulo & { classe: string }> = {
  sem_giro: {
    rotulo: "Sem giro", classe: "bg-red-50 text-red-700 border-red-200",
    explicacao: "Nenhuma saída para consumo no período analisado, mas ainda há saldo em estoque. Tudo o que está parado pode ser repassado.",
  },
  risco_vencimento: {
    rotulo: "Risco de vencimento", classe: "bg-orange-50 text-orange-700 border-orange-200",
    explicacao: "Pelo consumo médio, parte do estoque deve vencer antes de ser usada, ou já houve perda por vencimento no período.",
  },
  giro_raro: {
    rotulo: "Uso pontual", classe: "bg-amber-50 text-amber-700 border-amber-200",
    explicacao: "No máximo 3 saídas para consumo no período: o item é usado de forma esporádica e tende a sobrar.",
  },
  excesso: {
    rotulo: "Excesso de estoque", classe: "bg-blue-50 text-blue-700 border-blue-200",
    explicacao: "O saldo dura mais do que o horizonte escolhido (ex.: 180 dias) no ritmo atual de consumo. O que passa disso pode ser repassado.",
  },
  saudavel: {
    rotulo: "Giro saudável", classe: "bg-emerald-50 text-emerald-700 border-emerald-200",
    explicacao: "Consumo compatível com o estoque: o saldo dura dentro do horizonte e não há sobra prevista.",
  },
  estoque_baixo: {
    rotulo: "Estoque baixo", classe: "bg-red-50 text-red-700 border-red-200",
    explicacao: "O saldo dura menos de 15 dias no consumo atual. Há risco de faltar: não anuncie e avalie a reposição.",
  },
  sem_saldo: {
    rotulo: "Sem saldo", classe: "bg-slate-100 text-slate-600 border-slate-200",
    explicacao: "Saldo zero. Sem a aba Saldo Atual, as saídas superaram as entradas da planilha (o estoque anterior ao período não aparece).",
  },
}

export const PRIORIDADES: Record<PrioridadeEstoque, Rotulo & { classe: string; ponto: string; curto: string }> = {
  alta: {
    curto: "Alta", rotulo: "Prioridade alta", classe: "bg-red-600 text-white", ponto: "bg-red-600",
    explicacao: "Anuncie primeiro: item parado ou com maior quantidade prevista para vencer sem uso.",
  },
  media: {
    curto: "Média", rotulo: "Prioridade média", classe: "bg-amber-500 text-white", ponto: "bg-amber-500",
    explicacao: "Vale anunciar: há sobra, mas sem risco de vencimento próximo (ex.: excesso de estoque).",
  },
  baixa: {
    curto: "Baixa", rotulo: "Prioridade baixa", classe: "bg-slate-500 text-white", ponto: "bg-slate-500",
    explicacao: "Pode anunciar, mas confira antes: sobra pequena ou dado que precisa ser confirmado.",
  },
  nenhuma: {
    curto: "Não anunciar", rotulo: "Não anunciar", classe: "bg-slate-100 text-slate-600", ponto: "bg-slate-300",
    explicacao: "Não há sobra prevista para este item no horizonte escolhido: mantenha em estoque.",
  },
}

export const SINAIS: Record<SinalEstoque, Rotulo> = {
  sem_giro: { rotulo: "Sem consumo no período", explicacao: "Nenhuma saída para consumo registrada na planilha." },
  uso_pontual: { rotulo: "Uso pontual", explicacao: "Até 3 saídas para consumo no período." },
  sobra_no_vencimento: { rotulo: "Vai vencer sem uso", explicacao: "Pelo consumo médio, parte de um lote vence antes de ser usada." },
  perda_por_vencimento: { rotulo: "Já houve perda por vencimento", explicacao: "A planilha tem baixa por vencimento deste item no período." },
  excesso: { rotulo: "Cobertura acima do horizonte", explicacao: "O saldo dura mais do que o horizonte de planejamento escolhido." },
  lote_vencido: { rotulo: "Lote vencido em estoque", explicacao: "Há lote com validade passada: não pode ser anunciado; separe para descarte." },
  estoque_baixo: { rotulo: "Estoque baixo", explicacao: "O saldo dura menos de 15 dias no consumo atual." },
  saldo_estimado: { rotulo: "Saldo estimado", explicacao: "Sem a aba Saldo Atual, o saldo foi calculado por entradas menos saídas do período." },
  circula_sem_consumo: {
    rotulo: "Circula sem consumo registrado",
    explicacao: "O item é transferido entre estoques internos, mas não tem saída de consumo. Confirme se o uso é lançado com outro tipo.",
  },
}

/** Explicações de etiquetas e colunas que não são perfis nem prioridades. */
export const EXPLICACOES = {
  sugerido: "Quantidade que a análise sugere anunciar, mantendo em estoque o consumo previsto para o horizonte com 20% de margem.",
  publicado: "Um anúncio já foi publicado a partir desta sugestão.",
  recorrente: "Este item já tinha sobra na análise anterior e continua sobrando: vale priorizar o anúncio.",
  saldo: "Quantidade em estoque hoje. Com *, foi estimada pelas movimentações (sem a aba Saldo Atual).",
  consumo: "Média de consumo por mês no período da planilha.",
  cobertura: "Quantos dias o saldo dura no ritmo atual de consumo. \"Sem uso\" = não houve consumo no período.",
  anunciar: "Quantidade sugerida para anunciar. \"—\" = não há sobra prevista.",
  situacao: "Classificação do item pelo padrão de consumo. Passe o mouse ou toque na etiqueta para ver o significado.",
} as const

export const HORIZONTES = [
  { dias: 90, rotulo: "90 dias", descricao: "Mais itens sugeridos" },
  { dias: 180, rotulo: "180 dias", descricao: "Recomendado" },
  { dias: 365, rotulo: "1 ano", descricao: "Mais conservador" },
] as const

const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const MOEDA_INTEIRA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function fmtNumero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "—" : NUMERO.format(valor)
}

export function fmtMoeda(valor: number | null | undefined, semCentavos = false): string {
  if (valor === null || valor === undefined) return "—"
  return (semCentavos ? MOEDA_INTEIRA : MOEDA).format(valor)
}

/** "2026-11-23" → "23/11/2026" (sem passar por Date, para não deslocar o fuso). */
export function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—"
  const [a, m, d] = iso.slice(0, 10).split("-")
  return a && m && d ? `${d}/${m}/${a}` : "—"
}

export function fmtDataHora(iso: string): string {
  const data = new Date(iso)
  return isNaN(data.getTime())
    ? "—"
    : data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function fmtTamanho(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function unidade(texto: string): string {
  return texto ? texto.toLowerCase() : "un."
}
