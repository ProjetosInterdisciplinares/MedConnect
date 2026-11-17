export interface MatMed {
  cd_mat: number
  ds_mat?: string

  ds_marca?: string
  ds_tipo?: string
  ds_pessoaj: number

  unidade_med?: string
  cd_tuss: string
  cd_simpro?: string | null
  cd_brasindice?: string | null
  cd_catmat?: string | null
}

export interface CreateMatMedForm {
  ds_mat?: string

  ds_marca?: string
  ds_tipo?: string
  ds_pessoaj: number

  unidade_med?: string
  cd_tuss: string
  cd_simpro?: string
  cd_brasindice?: string
  cd_catmat?: string
}

export interface SugestaoCatmat {
  codigo: string
  descricao: string
}

export interface PrecoReferencia {
  encontrado: boolean
  periodo_inicio: string
  fonte: string
  aviso: string
  unidade?: string
  total_compras?: number
  menor?: string
  mediana?: string
  maior?: string
  exemplos?: { orgao: string; uf: string; data: string; preco_unitario: string }[]
}

export type UpdateMatMedForm = Partial<CreateMatMedForm>
