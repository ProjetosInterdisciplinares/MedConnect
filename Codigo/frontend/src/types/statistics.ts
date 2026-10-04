export interface StatisticsResponse {
  total_fabricantes?: number
  total_lotes?: number
  total_marcas?: number
  total_matmeds: number
  total_negociacoes: number
  total_pessoas_juridicas: number
  total_tipos_matmed?: number
  anuncios_ativos?: number
  anuncios_negociacao?: number
  anuncios_finalizados?: number
  anuncios_inativos?: number
  volume_financeiro?: number
  receita_creditos?: number
  creditos_consumidos?: number
  total_propostas?: number
  historico?: { name: string; anuncios: number; propostas: number }[]
  historico_rendas?: {
    diario: { name: string; valor: number }[]
    semanal: { name: string; valor: number }[]
    mensal: { name: string; valor: number }[]
    anual: { name: string; valor: number }[]
  }
}