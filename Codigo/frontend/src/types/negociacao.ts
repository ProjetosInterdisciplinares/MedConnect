export interface Negociacao {
  id: number
  anuncio: number
  comprador: number
  vendedor: number
  val_proposta: number | string
  qtd_proposta: number
  status: 'P' | 'A' | 'R' | 'C'
  data_proposta: string
  data_resposta?: string
  ds_obs?: string
  
  // Extra fields from backend serializer
  anuncio_nome?: string
  vendedor_nome?: string
  vendedor_email?: string
  vendedor_telefone?: string
  comprador_nome?: string
  comprador_email?: string
  comprador_telefone?: string
  anuncio_val_base?: number | string
  anuncio_qtd?: number
  anuncio_lote?: string
}

export interface CreateNegociacaoForm {
  anuncio: number
  vendedor: number
  val_proposta: number | string
  qtd_proposta: number
  ds_obs?: string
}

export type UpdateNegociacaoForm = Partial<CreateNegociacaoForm> & {
  status?: 'P' | 'A' | 'R' | 'C'
}
