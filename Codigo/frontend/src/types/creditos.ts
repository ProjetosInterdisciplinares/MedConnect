export type TipoTransacaoCredito = "C" | "D" | "E" | "B"
export type StatusTransacaoCredito = "P" | "A" | "R"
export type MetodoPagamento = "PIX" | "CARTAO" | "BOLETO"

export type PacoteCredito = {
	id: number
	nome: string
	descricao: string
	quantidade_creditos: number
	bonus_creditos: number
	total_creditos: number
	preco: string
	destaque: boolean
}

export type TransacaoCredito = {
	id: number
	tipo: TipoTransacaoCredito
	tipo_display: string
	status: StatusTransacaoCredito
	status_display: string
	quantidade: number
	saldo_apos: number
	is_entrada: boolean
	descricao: string
	funcionalidade: string | null
	referencia: string | null
	pacote: number | null
	pacote_nome: string | null
	valor_pago: string | null
	metodo_pagamento: MetodoPagamento | null
	metodo_pagamento_display: string | null
	codigo_pagamento: string | null
	data_transacao: string
}

export type SaldoCreditos = {
	saldo: number
	total_adquirido: number
	total_consumido: number
}

export type ComprarCreditosRequest = {
	pacote_id: number
	metodo_pagamento: MetodoPagamento
}

export type ComprarCreditosResponse = {
	mensagem: string
	saldo: number
	transacao: TransacaoCredito
}
