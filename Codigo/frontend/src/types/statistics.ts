export interface RankingItem {
  nome: string
  total: number
}

export interface IndicadoresControle {
  empresas_aprovadas: number
  empresas_pendentes: number
  empresas_bloqueadas: number
  empresas_sem_anuncio: number
  propostas_total: number
  propostas_pendentes: number
  propostas_aceitas: number
  propostas_recusadas: number
  propostas_canceladas: number
  taxa_aceite: number | null
  tempo_medio_resposta_horas: number | null
  anuncios_vencendo_30d: number
  top_materiais_propostas: RankingItem[]
  top_materiais_anunciados: RankingItem[]
  top_interesses: RankingItem[]
  creditos_boas_vindas: number
  creditos_expirados: number
}

export interface StatisticsResponse {
  controle?: IndicadoresControle
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