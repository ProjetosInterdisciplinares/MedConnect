"""
Livro-razão de créditos: operações de baixo nível sobre o saldo.

TODA alteração de saldo passa por aqui; nunca altere
PessoaJuridica.saldo_creditos diretamente. As funções travam a linha da
empresa (select_for_update) para evitar condições de corrida quando duas
requisições tentam gastar créditos ao mesmo tempo.

O código da aplicação usa a fachada creditos.carteira.CarteiraCreditos,
que combina estas operações com as ações pagas (creditos.acoes) e o
gateway de pagamento (creditos.pagamento).
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from pessoa_juridica.models import PessoaJuridica
from creditos.models import TransacaoCredito


# Créditos de boas-vindas (5W2H, R2): concedidos uma única vez, quando o
# cadastro da empresa é aprovado. O que não for usado dentro da validade
# é retirado do saldo (transação do tipo Expiração).
CREDITOS_BOAS_VINDAS = 50
VALIDADE_BOAS_VINDAS_DIAS = 90
REFERENCIA_BOAS_VINDAS = 'BOAS_VINDAS'


class SaldoInsuficienteError(Exception):
    def __init__(self, saldo_atual: int, custo: int):
        self.saldo_atual = saldo_atual
        self.custo = custo
        super().__init__(
            f'Saldo insuficiente: necessário {custo} crédito(s), disponível {saldo_atual}.'
        )


def _travar_empresa(pessoa_juridica_id: int) -> PessoaJuridica:
    return PessoaJuridica.objects.select_for_update().get(pk=pessoa_juridica_id)


def _expirar_creditos_vencidos(empresa: PessoaJuridica) -> None:
    """
    Retira do saldo os créditos de boas-vindas vencidos e não utilizados.
    Deve ser chamada com a linha da empresa já travada.

    Regra: o consumo feito depois da concessão usa primeiro os créditos de
    boas-vindas. Na expiração sai apenas o que sobrou deles.
    """
    vencidas = TransacaoCredito.objects.filter(
        pessoa_juridica=empresa,
        tipo=TransacaoCredito.TIPO_BONUS,
        referencia=REFERENCIA_BOAS_VINDAS,
        expira_em__lte=timezone.now(),
    )
    for concessao in vencidas:
        ref_expiracao = f'EXP-{concessao.pk}'
        if TransacaoCredito.objects.filter(
            pessoa_juridica=empresa,
            tipo=TransacaoCredito.TIPO_EXPIRACAO,
            referencia=ref_expiracao,
        ).exists():
            continue

        consumido_depois = TransacaoCredito.objects.filter(
            pessoa_juridica=empresa,
            tipo=TransacaoCredito.TIPO_CONSUMO,
            status=TransacaoCredito.STATUS_APROVADA,
            pk__gt=concessao.pk,
        ).aggregate(t=Sum('quantidade'))['t'] or 0

        restante = min(max(concessao.quantidade - consumido_depois, 0), empresa.saldo_creditos)
        if restante <= 0:
            continue

        empresa.saldo_creditos -= restante
        empresa.save(update_fields=['saldo_creditos'])
        TransacaoCredito.objects.create(
            pessoa_juridica=empresa,
            tipo=TransacaoCredito.TIPO_EXPIRACAO,
            quantidade=restante,
            saldo_apos=empresa.saldo_creditos,
            descricao='Expiração dos créditos de boas-vindas não utilizados',
            referencia=ref_expiracao,
        )


@transaction.atomic
def atualizar_validades(pessoa_juridica: PessoaJuridica) -> None:
    """Aplica as expirações pendentes e sincroniza o saldo da instância."""
    empresa = _travar_empresa(pessoa_juridica.pk)
    _expirar_creditos_vencidos(empresa)
    pessoa_juridica.saldo_creditos = empresa.saldo_creditos


def conceder_boas_vindas(pessoa_juridica: PessoaJuridica) -> TransacaoCredito | None:
    """Concede os créditos de boas-vindas uma única vez por empresa."""
    ja_recebeu = TransacaoCredito.objects.filter(
        pessoa_juridica_id=pessoa_juridica.pk,
        tipo=TransacaoCredito.TIPO_BONUS,
        referencia=REFERENCIA_BOAS_VINDAS,
    ).exists()
    if ja_recebeu:
        return None

    return adicionar_creditos(
        pessoa_juridica,
        CREDITOS_BOAS_VINDAS,
        f'Créditos de boas-vindas (válidos por {VALIDADE_BOAS_VINDAS_DIAS} dias)',
        tipo=TransacaoCredito.TIPO_BONUS,
        referencia=REFERENCIA_BOAS_VINDAS,
        expira_em=timezone.now() + timedelta(days=VALIDADE_BOAS_VINDAS_DIAS),
    )


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
    # Se faltar saldo, a exceção desfaz esta expiração; ela é reaplicada
    # na próxima consulta de saldo/extrato (atualizar_validades).
    _expirar_creditos_vencidos(empresa)
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


