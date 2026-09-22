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

  // Novos campos vindos da unificação da negociação
  val_proposta: string | null
  val_aceito: string | null
  cd_pessoa_compradora: number | null
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