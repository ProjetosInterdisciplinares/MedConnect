export type TipoMatMedCodigo = 'MD01' | 'MT01' | 'PD01'

export type TipoMatMedDescricao = 'MEDICAMENTO' | 'MATERIAL' | 'PRODUTO'

export interface TipoMatMed {
  cd_tipo: TipoMatMedCodigo
  ds_tipo: TipoMatMedDescricao
}

export interface CreateTipoMatMedForm {
  cd_tipo: TipoMatMedCodigo
  ds_tipo: TipoMatMedDescricao
}

export type UpdateTipoMatMedForm = Partial<CreateTipoMatMedForm>
