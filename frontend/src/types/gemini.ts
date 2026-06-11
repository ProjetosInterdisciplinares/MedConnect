export interface GerarAnuncioRequest {
  nr_lote: number
  cd_mat: number
  cd_negociante: number
  qtd_matmed: number
}

export interface GerarAnuncioSuccessResponse {
  texto_sugerido: string
}

export interface GerarAnuncioErrorResponse {
  erro: string
}