export interface Lote {
  nr_lote: number
  ds_lote: string

  dt_fabricacao: string
  dt_validade: string

  qtd_lote: number
  unidade_med: string

  ie_status: string

  fabricante: number
  cd_material: number
  cd_pessoaj: number
}

export interface CreateLoteForm {
  ds_lote: string | number
  dt_fabricacao: string
  dt_validade: string
  qtd_lote: number
  unidade_med: string
  fabricante: number
  cd_material: number
  cd_pessoaj: number
}

export type UpdateLoteForm = Partial<CreateLoteForm>
