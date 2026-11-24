/** Análise de estoque com IA (Anúncios → Analisar estoque com IA). */

export type NivelAlertaEstoque = "critico" | "aviso" | "info"

export interface AlertaEstoque {
  nivel: NivelAlertaEstoque
  titulo: string
  mensagem: string
  detalhes: string[]
}

export type PerfilEstoque =
  | "sem_giro"
  | "risco_vencimento"
  | "giro_raro"
  | "excesso"
  | "saudavel"
  | "estoque_baixo"
  | "sem_saldo"

export type PrioridadeEstoque = "alta" | "media" | "baixa" | "nenhuma"

export type SinalEstoque =
  | "sem_giro"
  | "uso_pontual"
  | "sobra_no_vencimento"
  | "perda_por_vencimento"
  | "excesso"
  | "lote_vencido"
  | "estoque_baixo"
  | "saldo_estimado"
  | "circula_sem_consumo"

export interface ItemAnaliseEstoque {
  chave: string
  codigo: string
  descricao: string
  unidade: string
  perfil: PerfilEstoque
  perfil_rotulo: string
  sinais: SinalEstoque[]
  prioridade: PrioridadeEstoque
  score: number
  anunciar: boolean
  qtd_sugerida: number
  qtd_sugerida_regra: number
  qtd_maxima: number
  saldo: number
  saldo_estimado: boolean
  saldo_negativo: boolean
  entradas: number
  compras: number
  consumo: number
  consumo_mensal: number
  eventos_consumo: number
  dias_com_consumo: number
  frequencia_semanal: number
  perda_vencimento: number
  perda_outra: number
  cobertura_dias: number | null
  dias_sem_consumo: number
  ultimo_consumo: string | null
  ultima_entrada: string | null
  validade_proxima: string | null
  qtd_risco_vencimento: number
  qtd_vencida: number
  qtd_sem_validade: number
  lote_sugerido: string
  validade_sugerida: string | null
  valor_unitario: number | null
  valor_excedente: number | null
  tem_movimentacao: boolean
  transferencias_internas: number
  justificativa: string
  fonte_justificativa: "ia" | "regra"
  anterior: {
    data: string
    saldo: number
    perfil: PerfilEstoque
    perfil_rotulo: string
    anunciar: boolean
    qtd_sugerida: number
  } | null
  /** Insumo já cadastrado ligado a este item (por código ou nome), para anunciar. */
  cd_mat: number | null
  insumo: InsumoVinculado | null
  /** Anúncio publicado a partir desta sugestão. */
  publicado: { nr_anuncio: number; qtd_mat: number; cd_mat: number; data: string | null } | null
}

export interface InsumoVinculado {
  cd_mat: number
  ds_mat: string
  ds_tipo: string | null
  ds_marca: string | null
  unidade_med: string | null
  cd_tuss: string | null
  cd_simpro: string | null
  cd_brasindice: string | null
}

/** Um anúncio configurado a partir de uma sugestão (mesmos campos do cadastro em massa). */
export interface PublicacaoSugestao {
  chave: string
  insumo:
    | { cd_mat: number }
    | { ds_mat: string; ds_tipo: string; ds_marca: string; unidade_med: string; cd_tuss: string; cd_simpro: string | null; cd_brasindice: string | null }
  anuncio: {
    ds_lote: string
    dt_fabricacao: string
    dt_validade: string
    qtd_mat: number
    val_base: string
    val_minimo: string | null
    ie_aceita_parcial: boolean
    ds_obs: string
    imagem_anuncio: string | null
  }
}

export interface PublicarSugestoesResposta {
  mensagem: string
  total_criados: number
  analise: AnaliseEstoque
}

export interface IndicadoresEstoque {
  total_materiais: number
  total_sugeridos: number
  prioridade_alta: number
  valor_total_sugerido: number | null
  itens_com_vencido: number
  itens_com_perda_vencimento: number
  perfis: Record<PerfilEstoque, number>
  total_movimentacoes: number
  linhas_lidas: number
  transferencias_internas: number
  saldo_informado: boolean
  movimentacoes_por_tipo: Record<string, number>
}

export interface ResumoAnaliseEstoque {
  id: number
  criado_em: string
  nome_arquivo: string
  periodo_inicio: string
  periodo_fim: string
  dias_periodo: number
  horizonte_dias: number
  total_movimentacoes: number
  total_materiais: number
  total_sugeridos: number
  ia_utilizada: boolean
  creditos_cobrados: number
  valor_total_sugerido: number | null
  alertas_criticos: number
}

export interface AnaliseEstoque extends ResumoAnaliseEstoque {
  analise_anterior_id: number | null
  resumo_ia: string
  recomendacoes: string[]
  indicadores: IndicadoresEstoque
  alertas: AlertaEstoque[]
  itens: ItemAnaliseEstoque[]
}
