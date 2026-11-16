from datetime import timedelta

from django.db import models
from django.utils import timezone

from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica


class AnuncioQuerySet(models.QuerySet):

    def inativar_vencidos(self) -> int:
        """RN02: anúncios ativos com validade vencida saem do catálogo."""
        return self.filter(
            ie_status=Anuncio.STATUS_ATIVO, dt_validade__lt=timezone.now().date(),
        ).update(ie_status=Anuncio.STATUS_INATIVO)


class Anuncio(models.Model):
    STATUS_ATIVO = 'A'          # Público, aguardando propostas
    STATUS_NEGOCIACAO = 'N'     # Proposta recebida; apenas 1 comprador negociando
    STATUS_FINALIZADO = 'F'     # Negócio fechado, val_aceito registrado
    STATUS_INATIVO = 'I'
    STATUS_SALDO = 'S'          # Saldo de venda parcial

    STATUS_CHOICES = [
        (STATUS_ATIVO, 'Ativo'),
        (STATUS_NEGOCIACAO, 'Em Negociação'),
        (STATUS_FINALIZADO, 'Finalizado'),
        (STATUS_INATIVO, 'Inativo / Rascunho'),
        (STATUS_SALDO, 'Saldo de Venda Parcial'),
    ]

    objects = AnuncioQuerySet.as_manager()

    nr_anuncio           = models.AutoField(primary_key=True)
    
    ds_lote              = models.CharField(max_length=50, blank=True, null=True, verbose_name="Lote")
    dt_fabricacao        = models.DateField(blank=True, null=True, verbose_name="Data de Fabricação")
    dt_validade          = models.DateField(blank=True, null=True, verbose_name="Data de Validade")
    
    cd_mat               = models.ForeignKey(MatMed, on_delete=models.RESTRICT, related_name='anuncios')
    qtd_mat              = models.IntegerField()
    val_base             = models.DecimalField(max_digits=10, decimal_places=2)
    cd_pessoa_anunciante = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='anuncios')
    ds_obs               = models.CharField(max_length=2000, blank=True, default='')
    data_anuncio         = models.DateField(auto_now_add=True)
    ie_status            = models.CharField(max_length=1, choices=STATUS_CHOICES, default='A')
    imagem_anuncio       = models.TextField(blank=True, null=True, verbose_name="Imagem do Anúncio (Base64)")

    # Campos de negociação
    val_proposta         = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    val_aceito           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cd_pessoa_compradora = models.ForeignKey(
        PessoaJuridica,
        null=True,
        blank=True,
        on_delete=models.RESTRICT,
        related_name='anuncios_comprados'
    )

    class Meta:
        verbose_name = 'Anuncio'
        verbose_name_plural = 'Anúncios'

    def __str__(self):
        return f'Anúncio {self.nr_anuncio}'

class NegociacaoQuerySet(models.QuerySet):

    def expirar_vencidas(self) -> int:
        """
        Propostas pendentes cujo prazo de resposta passou viram "Expirada" e o
        anúncio volta ao catálogo. Salva uma a uma para avisar as partes (Observer).
        """
        from django.db import transaction

        agora = timezone.now()
        vencidas = self.filter(status=Negociacao.STATUS_PENDENTE, prazo_resposta__lt=agora).select_related('anuncio')
        total = 0
        for negociacao in vencidas:
            with transaction.atomic():
                negociacao.status = Negociacao.STATUS_EXPIRADA
                negociacao.data_resposta = agora
                negociacao.save()
                anuncio = negociacao.anuncio
                if anuncio.ie_status == Anuncio.STATUS_NEGOCIACAO and anuncio.cd_pessoa_compradora_id == negociacao.comprador_id:
                    anuncio.ie_status = Anuncio.STATUS_ATIVO
                    anuncio.val_proposta = None
                    anuncio.cd_pessoa_compradora = None
                    anuncio.save()
            total += 1
        return total


class Negociacao(models.Model):
    STATUS_PENDENTE = 'P'
    STATUS_ACEITA = 'A'          # contatos liberados; aguardando a conclusão
    STATUS_RECUSADA = 'R'
    STATUS_CANCELADA = 'C'
    STATUS_EXPIRADA = 'E'        # o vendedor não respondeu no prazo
    STATUS_CONCLUIDA = 'F'       # entrega e recebimento confirmados
    STATUS_NAO_CONCLUIDA = 'N'   # o negócio não aconteceu

    STATUS_CHOICES = [
        (STATUS_PENDENTE, 'Pendente'),
        (STATUS_ACEITA, 'Aceita'),
        (STATUS_RECUSADA, 'Recusada'),
        (STATUS_CANCELADA, 'Cancelada'),
        (STATUS_EXPIRADA, 'Expirada'),
        (STATUS_CONCLUIDA, 'Concluída'),
        (STATUS_NAO_CONCLUIDA, 'Não concluída'),
    ]
    # Depois do aceite, as partes veem os contatos uma da outra
    STATUS_COM_CONTATOS = (STATUS_ACEITA, STATUS_CONCLUIDA, STATUS_NAO_CONCLUIDA)

    MOTIVO_CHOICES = [
        ('VALOR', 'Valor abaixo do esperado'),
        ('QUANTIDADE', 'Quantidade não atende'),
        ('NEGOCIADO', 'Lote já negociado'),
        ('OUTRO', 'Outro motivo'),
    ]

    PRAZO_RESPOSTA = timedelta(hours=72)

    objects = NegociacaoQuerySet.as_manager()

    id = models.AutoField(primary_key=True)
    anuncio = models.ForeignKey(Anuncio, on_delete=models.CASCADE, related_name='negociacoes')
    comprador = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='negociacoes_enviadas')
    vendedor = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='negociacoes_recebidas')
    val_proposta = models.DecimalField(max_digits=10, decimal_places=2)
    qtd_proposta = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    data_proposta = models.DateTimeField(auto_now_add=True)
    data_resposta = models.DateTimeField(null=True, blank=True)
    ds_obs = models.TextField(blank=True, default='')

    prazo_resposta = models.DateTimeField(null=True, blank=True)
    motivo_recusa = models.CharField(max_length=20, choices=MOTIVO_CHOICES, null=True, blank=True)
    detalhe_recusa = models.CharField(max_length=255, blank=True, default='')
    entregue_em = models.DateTimeField(null=True, blank=True)    # confirmado pelo vendedor
    recebido_em = models.DateTimeField(null=True, blank=True)    # confirmado pelo comprador

    class Meta:
        verbose_name = 'Negociação'
        verbose_name_plural = 'Negociações'

    def __str__(self):
        return f'Negociação {self.id} - Anúncio {self.anuncio.nr_anuncio}'