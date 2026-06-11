export interface Anuncio {
  nr_anuncio: number
  ds_lote: string | null
  nr_lote: number | null
  cd_mat: number
  material_nome?: string
  qtd_mat: number
  val_base: string 
  cd_pessoa_anunciante: number
  ds_obs: string
  data_anuncio: string
  ie_status: 'A' | 'N' | 'F' | 'I'

  // Novos campos vindos da unificação da negociação
  val_proposta: string | null
  val_aceito: string | null
  cd_pessoa_compradora: number | null
}

export interface CreateAnuncioForm {
  nr_lote: number | null
  ds_lote: string | null
  cd_mat: number
  qtd_mat: number
  val_base: string
  cd_pessoa_anunciante: number
  ds_obs?: string
  // 1. Removido o status do Create. Quando cria, o Django assume o default='A'
}

// 2. O Update PRECISA aceitar os novos campos de negociação
export interface UpdateAnuncioForm {
  nr_lote?: number | null
  cd_mat?: number
  qtd_mat?: number
  val_base?: string
  ds_obs?: string
  ie_status?: 'A' | 'N' | 'F' | 'I'
  val_proposta?: string | null
  val_aceito?: string | null
  cd_pessoa_compradora?: number | null
}