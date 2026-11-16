export type TipoNotificacao = "CREDENCIAMENTO" | "NEGOCIACAO" | "ALERTA" | "CREDITOS"

export type Notificacao = {
	id: number
	tipo: TipoNotificacao
	tipo_display: string
	mensagem: string
	referencia: string | null
	lida: boolean
	criada_em: string
}

export type NotificacoesResponse = {
	nao_lidas: number
	notificacoes: Notificacao[]
}

export type AlertaInteresse = {
	id: number
	termo: string
	ativo: boolean
	criado_em: string
}
