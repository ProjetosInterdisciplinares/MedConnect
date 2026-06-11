import type { TipoMatMedCodigo } from './tipo_matmed'

export interface MatMed {
  cd_mat: number
  ds_mat: string

  ds_marca: number
  ds_tipo: TipoMatMedCodigo
  ds_pessoaj: number

  cd_tiss?: string | null
  cd_tuss?: string | null
  cd_simpro?: string | null
  cd_brasindice?: string | null
}

export interface CreateMatMedForm {
  ds_mat: string

  ds_marca: number
  ds_tipo: TipoMatMedCodigo
  ds_pessoaj: number

  cd_tiss?: string
  cd_tuss?: string
  cd_simpro?: string
  cd_brasindice?: string
}

export type UpdateMatMedForm =
  Partial<CreateMatMedForm>
