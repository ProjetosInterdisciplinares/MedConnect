"""
Gateway de pagamento — padrão Adapter.

A carteira de créditos depende apenas da interface GatewayPagamento.
Hoje o pagamento é simulado e aprovado na hora. Para integrar um gateway
real (Mercado Pago, Stripe, Pagar.me...), basta criar um novo adaptador
que encapsule o SDK do gateway, sem alterar a carteira.
"""
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class ResultadoPagamento:
    aprovado: bool
    codigo: str
    mensagem: str = ''


class PagamentoRecusadoError(Exception):
    """O gateway não aprovou o pagamento."""


class GatewayPagamento(ABC):

    @abstractmethod
    def cobrar(self, pacote, metodo: str) -> ResultadoPagamento:
        ...


class PagamentoSimuladoAdapter(GatewayPagamento):
    """
    Pagamento simulado: aprova imediatamente e gera um código SIM-XXXX.
    Num gateway real, a compra ficaria pendente até o webhook de confirmação.
    """

    def cobrar(self, pacote, metodo: str) -> ResultadoPagamento:
        return ResultadoPagamento(aprovado=True, codigo=f'SIM-{uuid.uuid4().hex[:12].upper()}')


def gateway_padrao() -> GatewayPagamento:
    return PagamentoSimuladoAdapter()
