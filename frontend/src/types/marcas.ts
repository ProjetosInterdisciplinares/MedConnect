export interface Marca {
  cd_marca: number
  ds_marca: string
}

export interface CreateMarcaForm {
  ds_marca: string
}

export type UpdateMarcaForm = Partial<CreateMarcaForm>
