export interface Negociacao {
  nr_negociacao: number
  obs_negocia: string
  qtd_matmed: number
  /** FK → Anuncio.nr_anuncio */
  nr_anuncio: number
  /** FK → PessoaJuridica.cd_pessoaj (quem oferta) */
  cd_negociador: number
  /** FK → PessoaJuridica.cd_pessoaj (quem solicita) */
  cd_negociante: number
}

export interface CreateNegociacaoForm {
  obs_negocia?: string
  qtd_matmed: number
  nr_anuncio: number
  cd_negociador: number
  cd_negociante: number
}

export type UpdateNegociacaoForm = Partial<CreateNegociacaoForm>
