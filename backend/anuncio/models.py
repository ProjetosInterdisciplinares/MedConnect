from django.db import models
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from lote.models import Lote

class Anuncio(models.Model):
    STATUS_CHOICES = [
        ('A', 'Ativo'),         # Anúncio público, aguardando propostas
        ('N', 'Em Negociação'), # Proposta recebida, anúncio travado — apenas 1 comprador negociando
        ('F', 'Finalizado'),    # Negócio fechado, val_aceito registrado
        ('I', 'Inativo'),       # Removido por validade, inconformidade ou manualmente
    ]

    nr_anuncio           = models.AutoField(primary_key=True)
    nr_lote              = models.ForeignKey(Lote, on_delete=models.RESTRICT, related_name='anuncios', null=True, blank=True)
    cd_mat               = models.ForeignKey(MatMed, on_delete=models.RESTRICT, related_name='anuncios')
    qtd_mat              = models.IntegerField()
    val_base             = models.DecimalField(max_digits=10, decimal_places=2)
    cd_pessoa_anunciante = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='anuncios')
    ds_obs               = models.CharField(max_length=2000, blank=True, default='')
    data_anuncio         = models.DateField(auto_now_add=True)
    ie_status            = models.CharField(max_length=1, choices=STATUS_CHOICES, default='A')

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