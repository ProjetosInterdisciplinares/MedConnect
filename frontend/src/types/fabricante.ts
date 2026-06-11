export interface Fabricante {
  cd_fabricante: number
  ds_fabricante: string
  cnpj_fabri: string
}

export interface CreateFabricanteForm {
  ds_fabricante: string
  cnpj_fabri: string
}

export type UpdateFabricanteForm = Partial<CreateFabricanteForm>