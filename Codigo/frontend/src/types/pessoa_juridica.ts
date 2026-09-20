export type PessoaJuridica = {
	cd_pessoaj: number
	nm_pessoaj: string
	email_pj: string
	senha_pj: string
	resp_tec: string
	nr_cnpj: string
	razao_social: string
	status: string
	imagem_perfil: string | null
	is_admin?: boolean
}

export interface CreatePessoaJuridicaForm {
  nm_pessoaj: string
  email_pj: string
  senha_pj: string
  resp_tec: string
  nr_cnpj: string
  razao_social: string
  imagem_perfil?: string | null
}

export type UpdatePessoaJuridicaForm = Partial<CreatePessoaJuridicaForm>
