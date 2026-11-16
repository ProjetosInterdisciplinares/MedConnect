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
	cep?: string | null
	logradouro?: string | null
	numero?: string | null
	complemento?: string | null
	bairro?: string | null
	cidade?: string | null
	estado?: string | null
	telefone?: string | null
	latitude?: number | null
	longitude?: number | null
	saldo_creditos?: number
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

/** Item do relatório de verificação do CNPJ (painel do admin). */
export type ItemVerificacao = {
  chave: "digitos" | "receita" | "situacao" | "razao_social" | "atividade" | "localizacao" | string
  rotulo: string
  situacao: "ok" | "alerta" | "erro"
  detalhe: string
}

/** Relatório que compara o cadastro da empresa com os dados da Receita Federal. */
export type VerificacaoCredenciamento = {
  cnpj: string
  resultado: "ok" | "alerta" | "erro"
  itens: ItemVerificacao[]
  dados_receita: {
    razao_social: string
    nome_fantasia: string
    situacao: string
    cnae_codigo: string
    cnae_descricao: string
    municipio: string
    uf: string
    data_abertura: string
  } | null
  consultado_em: string | null
  aviso: string | null
}
