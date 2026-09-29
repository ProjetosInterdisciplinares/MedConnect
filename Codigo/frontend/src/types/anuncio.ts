export interface Anuncio {
  nr_anuncio: number
  ds_lote: string | null
  dt_fabricacao: string | null
  dt_validade: string | null
  cd_mat: number
  material_nome?: string
  qtd_mat: number
  val_base: string
  cd_pessoa_anunciante: number
  ds_obs: string
  data_anuncio: string
  ie_status: 'A' | 'N' | 'F' | 'I'
  imagem_anuncio?: string
  anunciante_razao?: string
  anunciante_lat?: number
  anunciante_lon?: number
  anunciante_cidade?: string
  anunciante_estado?: string
  anunciante_logradouro?: string
  anunciante_numero?: string
  anunciante_bairro?: string
  anunciante_cep?: string
  anunciante_email?: string
  anunciante_telefone?: string

  // Novos campos vindos da unificação da negociação
  val_proposta: string | null
  val_aceito: string | null
  cd_pessoa_compradora: number | null

  // Recomendação inteligente (IA)
  is_recommended?: boolean
}

export interface CreateAnuncioForm {
  ds_lote?: string | null
  dt_fabricacao?: string | null
  dt_validade?: string | null
  cd_mat: number
  qtd_mat: number
  val_base: string
  cd_pessoa_anunciante: number
  ds_obs?: string
  imagem_anuncio?: string
}

export interface UpdateAnuncioForm {
  ds_lote?: string | null
  dt_fabricacao?: string | null
  dt_validade?: string | null
  cd_mat?: number
  qtd_mat?: number
  val_base?: string
  ds_obs?: string
  ie_status?: 'A' | 'N' | 'F' | 'I'
  val_proposta?: string | null
  val_aceito?: string | null
  cd_pessoa_compradora?: number | null
}

export interface Negociacao {
  id: number
  anuncio: number
  comprador: number
  vendedor: number
  val_proposta: string
  qtd_proposta: number | null
  status: 'P' | 'A' | 'R' | 'C'
  data_proposta: string
  data_resposta: string | null
  ds_obs: string

  // Campos extras (read_only no backend via serializer)
  anuncio_nome?: string
  vendedor_nome?: string
  vendedor_email?: string
  vendedor_telefone?: string
  comprador_nome?: string
  comprador_email?: string
  comprador_telefone?: string
  anuncio_val_base?: string
  anuncio_qtd?: number
  anuncio_lote?: string
}

export interface CreateNegociacaoForm {
  anuncio: number
  vendedor: number
  val_proposta: string
  qtd_proposta?: number
  ds_obs?: string
}

export interface UpdateNegociacaoForm {
  status: 'A' | 'R' | 'C'
}