"""
Camada de serviço de créditos.

TODA alteração de saldo deve passar por aqui — nunca altere
PessoaJuridica.saldo_creditos diretamente. As funções travam a linha da
empresa (select_for_update) para evitar condições de corrida quando duas
requisições tentam gastar créditos ao mesmo tempo.
"""
import uuid
from django.db import transaction

from pessoa_juridica.models import PessoaJuridica
from creditos.models import TransacaoCredito, PacoteCredito


# ──────────────────────────────────────────────────────────────────────
# Tabela de custos por funcionalidade (RF15).
# Será preenchida quando os custos forem definidos, ex:
#   'IA_DESCRICAO': 2,
#   'COMPARATIVO_PRECO': 10,   # RN04
# ──────────────────────────────────────────────────────────────────────
CUSTOS_FUNCIONALIDADES: dict[str, int] = {
    'IA_DESCRICAO': 1,
    'PUBLICAR_ANUNCIO': 5,
}


class SaldoInsuficienteError(Exception):
    def __init__(self, saldo_atual: int, custo: int):
        self.saldo_atual = saldo_atual
        self.custo = custo
        super().__init__(
            f'Saldo insuficiente: necessário {custo} crédito(s), disponível {saldo_atual}.'
        )


def _travar_empresa(pessoa_juridica_id: int) -> PessoaJuridica:
    return PessoaJuridica.objects.select_for_update().get(pk=pessoa_juridica_id)


@transaction.atomic
def adicionar_creditos(
    pessoa_juridica: PessoaJuridica,
    quantidade: int,
    descricao: str,
    tipo: str = TransacaoCredito.TIPO_BONUS,
    **extra,
) -> TransacaoCredito:
    if quantidade <= 0:
        raise ValueError('A quantidade de créditos deve ser positiva.')

    empresa = _travar_empresa(pessoa_juridica.pk)
    empresa.saldo_creditos += quantidade
    empresa.save(update_fields=['saldo_creditos'])

    # Mantém a instância do chamador sincronizada
    pessoa_juridica.saldo_creditos = empresa.saldo_creditos

    return TransacaoCredito.objects.create(
        pessoa_juridica=empresa,
        tipo=tipo,
        quantidade=quantidade,
        saldo_apos=empresa.saldo_creditos,
        descricao=descricao,
        **extra,
    )


@transaction.atomic
def debitar_creditos(
    pessoa_juridica: PessoaJuridica,
    quantidade: int,
    descricao: str,
    funcionalidade: str | None = None,
    referencia: str | None = None,
) -> TransacaoCredito:
    """Desconta créditos. Lança SaldoInsuficienteError se não houver saldo."""
    if quantidade <= 0:
        raise ValueError('A quantidade de créditos deve ser positiva.')

    empresa = _travar_empresa(pessoa_juridica.pk)
    if empresa.saldo_creditos < quantidade:
        raise SaldoInsuficienteError(empresa.saldo_creditos, quantidade)

    empresa.saldo_creditos -= quantidade
    empresa.save(update_fields=['saldo_creditos'])
    pessoa_juridica.saldo_creditos = empresa.saldo_creditos

    return TransacaoCredito.objects.create(
        pessoa_juridica=empresa,
        tipo=TransacaoCredito.TIPO_CONSUMO,
        quantidade=quantidade,
        saldo_apos=empresa.saldo_creditos,
        descricao=descricao,
        funcionalidade=funcionalidade,
        referencia=referencia,
    )


def consumir_funcionalidade(
    pessoa_juridica: PessoaJuridica,
    funcionalidade: str,
    descricao: str,
    referencia: str | None = None,
) -> TransacaoCredito | None:
    """
    Debita o custo configurado em CUSTOS_FUNCIONALIDADES.
    Se a funcionalidade não tiver custo definido (ou custo 0), não debita nada.
    """
    custo = CUSTOS_FUNCIONALIDADES.get(funcionalidade, 0)
    if custo <= 0:
        return None
    return debitar_creditos(pessoa_juridica, custo, descricao, funcionalidade, referencia)


def processar_compra_pacote(
    pessoa_juridica: PessoaJuridica,
    pacote: PacoteCredito,
    metodo_pagamento: str,
) -> TransacaoCredito:
    """
    Processa a compra de um pacote.

    ⚠️ PAGAMENTO SIMULADO: a compra é aprovada imediatamente.
    Para integrar um gateway real (Mercado Pago, Stripe, Pagar.me...),
    crie a transação como PENDENTE aqui e só credite o saldo no webhook
    de confirmação do pagamento.
    """
    codigo = f'SIM-{uuid.uuid4().hex[:12].upper()}'

    descricao = f'Compra do pacote {pacote.nome}'
    if pacote.bonus_creditos:
        descricao += f' (+{pacote.bonus_creditos} bônus)'

    return adicionar_creditos(
        pessoa_juridica,
        pacote.total_creditos,
        descricao,
        tipo=TransacaoCredito.TIPO_COMPRA,
        status=TransacaoCredito.STATUS_APROVADA,
        pacote=pacote,
        valor_pago=pacote.preco,
        metodo_pagamento=metodo_pagamento,
        codigo_pagamento=codigo,
    )
