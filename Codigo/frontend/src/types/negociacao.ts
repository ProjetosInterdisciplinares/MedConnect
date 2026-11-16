/**
 * P Pendente · A Aceita (contatos liberados) · R Recusada · C Cancelada
 * E Expirada (sem resposta no prazo) · F Concluída · N Não concluída
 */
export type StatusNegociacao = 'P' | 'A' | 'R' | 'C' | 'E' | 'F' | 'N'

export type MotivoRecusa = 'VALOR' | 'QUANTIDADE' | 'NEGOCIADO' | 'OUTRO'

export interface Negociacao {
  id: number
  anuncio: number
  comprador: number
  vendedor: number
  val_proposta: number | string
  qtd_proposta: number
  status: StatusNegociacao
  status_display?: string
  data_proposta: string
  data_resposta?: string
  ds_obs?: string
  prazo_resposta?: string | null
  motivo_recusa?: MotivoRecusa | null
  motivo_recusa_display?: string | null
  detalhe_recusa?: string
  entregue_em?: string | null
  recebido_em?: string | null

  // Extra fields from backend serializer
  anuncio_nome?: string
  vendedor_nome?: string
  comprador_nome?: string
  // Contatos: só vêm preenchidos depois do aceite (null antes disso)
  vendedor_email?: string | null
  vendedor_telefone?: string | null
  vendedor_responsavel?: string | null
  comprador_email?: string | null
  comprador_telefone?: string | null
  comprador_responsavel?: string | null
  anuncio_val_base?: number | string
  anuncio_qtd?: number
  anuncio_lote?: string
  anuncio_descricao?: string
  anuncio_unidade?: string | null
}

export interface CreateNegociacaoForm {
  anuncio: number
  vendedor: number
  val_proposta: number | string
  qtd_proposta: number
  ds_obs?: string
}

export type UpdateNegociacaoForm = Partial<CreateNegociacaoForm> & {
  status?: 'A' | 'R' | 'C'
  /** Ao recusar: motivo e complemento opcional. */
  motivo_recusa?: MotivoRecusa
  detalhe_recusa?: string
  /** Venda parcial: recoloca o saldo restante no catálogo. */
  reativar_saldo?: boolean
  /** Venda parcial: novo valor total do saldo restante. */
  novo_val_base?: string
  /** Venda parcial: nova descrição do saldo restante. */
  nova_descricao?: string
}
