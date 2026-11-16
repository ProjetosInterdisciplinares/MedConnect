"""
Carteira de créditos de uma empresa — padrão Facade.

É o único ponto de entrada do restante do sistema para créditos. Esconde
o livro-razão (creditos.services), a expiração dos créditos de
boas-vindas, as ações pagas (Decorator) e o gateway de pagamento (Adapter).
"""
from django.db.models import Sum

from creditos import services
from creditos.acoes import AcaoPaga
from creditos.models import PacoteCredito, TransacaoCredito
from creditos.pagamento import GatewayPagamento, PagamentoRecusadoError, gateway_padrao
from creditos.services import SaldoInsuficienteError

__all__ = ['CarteiraCreditos', 'SaldoInsuficienteError', 'PagamentoRecusadoError']

LIMITE_EXTRATO_PADRAO = 200
LIMITE_EXTRATO_MAXIMO = 500


class CarteiraCreditos:

    def __init__(self, empresa, gateway: GatewayPagamento | None = None):
        self._empresa = empresa
        self._gateway = gateway or gateway_padrao()

    # ── Consulta ──────────────────────────────────────────────────────

    def saldo(self) -> int:
        services.atualizar_validades(self._empresa)
        return self._empresa.saldo_creditos

    def resumo(self) -> dict:
        saldo = self.saldo()
        aprovadas = TransacaoCredito.objects.filter(
            pessoa_juridica=self._empresa, status=TransacaoCredito.STATUS_APROVADA,
        )
        adquirido = aprovadas.exclude(tipo__in=TransacaoCredito.TIPOS_SAIDA).aggregate(t=Sum('quantidade'))['t']
        consumido = aprovadas.filter(tipo=TransacaoCredito.TIPO_CONSUMO).aggregate(t=Sum('quantidade'))['t']
        return {'saldo': saldo, 'total_adquirido': adquirido or 0, 'total_consumido': consumido or 0}

    def extrato(self, tipo: str | None = None, limite: int = LIMITE_EXTRATO_PADRAO):
        services.atualizar_validades(self._empresa)
        transacoes = TransacaoCredito.objects.filter(pessoa_juridica=self._empresa).select_related('pacote')
        if tipo in dict(TransacaoCredito.TIPO_CHOICES):
            transacoes = transacoes.filter(tipo=tipo)
        return transacoes[:min(limite, LIMITE_EXTRATO_MAXIMO)]

    # ── Uso de funcionalidades ────────────────────────────────────────

    def garantir_saldo(self, acao: AcaoPaga) -> None:
        """
        Confere, sem debitar, se o saldo cobre a ação. Usado antes de
        operações lentas (como a IA) para não gastar a chamada à toa.
        """
        custo = acao.custo()
        if custo > 0 and self.saldo() < custo:
            raise SaldoInsuficienteError(self._empresa.saldo_creditos, custo)

    def debitar(self, acao: AcaoPaga, referencia: str | None = None) -> TransacaoCredito | None:
        """Debita o custo da ação. Lança SaldoInsuficienteError se faltar saldo."""
        custo = acao.custo()
        if custo <= 0:
            return None
        return services.debitar_creditos(
            self._empresa, custo, acao.descricao(), funcionalidade=acao.codigo, referencia=referencia,
        )

    # ── Entradas ──────────────────────────────────────────────────────

    def conceder_boas_vindas(self) -> TransacaoCredito | None:
        return services.conceder_boas_vindas(self._empresa)

    def comprar_pacote(self, pacote: PacoteCredito, metodo: str) -> TransacaoCredito:
        resultado = self._gateway.cobrar(pacote, metodo)
        if not resultado.aprovado:
            raise PagamentoRecusadoError(resultado.mensagem or 'Pagamento recusado.')

        descricao = f'Compra do pacote {pacote.nome}'
        if pacote.bonus_creditos:
            descricao += f' (+{pacote.bonus_creditos} bônus)'

        return services.adicionar_creditos(
            self._empresa,
            pacote.total_creditos,
            descricao,
            tipo=TransacaoCredito.TIPO_COMPRA,
            status=TransacaoCredito.STATUS_APROVADA,
            pacote=pacote,
            valor_pago=pacote.preco,
            metodo_pagamento=metodo,
            codigo_pagamento=resultado.codigo,
        )
