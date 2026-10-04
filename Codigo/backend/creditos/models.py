from django.db import models
from pessoa_juridica.models import PessoaJuridica


class PacoteCredito(models.Model):
    """
    Pacotes de créditos disponíveis para compra (RF13 / RN05).
    Gerenciáveis pelo Django Admin — preços e quantidades podem ser
    ajustados sem alterar código.
    """
    nome = models.CharField(max_length=60)
    descricao = models.CharField(max_length=255, blank=True, default='')
    quantidade_creditos = models.PositiveIntegerField()
    bonus_creditos = models.PositiveIntegerField(default=0)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    destaque = models.BooleanField(default=False, help_text='Exibe o selo "Mais popular".')
    ativo = models.BooleanField(default=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Pacote de Créditos'
        verbose_name_plural = 'Pacotes de Créditos'
        ordering = ('ordem', 'preco')

    @property
    def total_creditos(self):
        return self.quantidade_creditos + self.bonus_creditos

    def __str__(self):
        return f'{self.nome} ({self.total_creditos} créditos - R$ {self.preco})'


class TransacaoCredito(models.Model):
    """
    Livro-razão (ledger) imutável de toda movimentação de créditos (RF16).
    O saldo corrente fica em PessoaJuridica.saldo_creditos e cada transação
    guarda o saldo resultante (saldo_apos) para auditoria.
    """
    TIPO_COMPRA = 'C'
    TIPO_CONSUMO = 'D'
    TIPO_ESTORNO = 'E'
    TIPO_BONUS = 'B'

    TIPO_CHOICES = [
        (TIPO_COMPRA, 'Compra'),
        (TIPO_CONSUMO, 'Consumo'),
        (TIPO_ESTORNO, 'Estorno'),
        (TIPO_BONUS, 'Bônus / Ajuste'),
    ]

    STATUS_PENDENTE = 'P'
    STATUS_APROVADA = 'A'
    STATUS_RECUSADA = 'R'

    STATUS_CHOICES = [
        (STATUS_PENDENTE, 'Pendente'),
        (STATUS_APROVADA, 'Aprovada'),
        (STATUS_RECUSADA, 'Recusada'),
    ]

    METODO_CHOICES = [
        ('PIX', 'PIX'),
        ('CARTAO', 'Cartão de Crédito'),
        ('BOLETO', 'Boleto'),
    ]

    pessoa_juridica = models.ForeignKey(
        PessoaJuridica,
        on_delete=models.RESTRICT,
        related_name='transacoes_credito',
    )
    tipo = models.CharField(max_length=1, choices=TIPO_CHOICES)
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default=STATUS_APROVADA)

    # Sempre positivo; o sinal é determinado pelo tipo (C/E/B soma, D subtrai)
    quantidade = models.PositiveIntegerField()
    saldo_apos = models.PositiveIntegerField()

    descricao = models.CharField(max_length=255)

    # Código da funcionalidade consumida (ex: 'IA_DESCRICAO', 'COMPARATIVO_PRECO')
    funcionalidade = models.CharField(max_length=50, blank=True, null=True)
    # Referência livre ao objeto relacionado (ex: id do anúncio)
    referencia = models.CharField(max_length=100, blank=True, null=True)

    # Dados da compra
    pacote = models.ForeignKey(
        PacoteCredito,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transacoes',
    )
    valor_pago = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    metodo_pagamento = models.CharField(max_length=10, choices=METODO_CHOICES, null=True, blank=True)
    codigo_pagamento = models.CharField(max_length=100, null=True, blank=True)

    data_transacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transação de Crédito'
        verbose_name_plural = 'Transações de Crédito'
        ordering = ('-data_transacao', '-id')
        indexes = [
            models.Index(fields=['pessoa_juridica', '-data_transacao']),
        ]

    @property
    def is_entrada(self):
        return self.tipo != self.TIPO_CONSUMO

    def __str__(self):
        sinal = '+' if self.is_entrada else '-'
        return f'{self.get_tipo_display()} {sinal}{self.quantidade} - {self.pessoa_juridica}'
