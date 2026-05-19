from django.db import models
from mat_med.models import MatMed
from pessoa_juridica.models import PessoaJuridica
from lote.models import Lote

class Anuncio(models.Model):
    STATUS_CHOICES = [
        ('A', 'Ativo'),
        ('I', 'Inativo'),
        ('F', 'Finalizado'),
    ]

    nr_anuncio           = models.AutoField(primary_key=True)
    nr_lote              = models.ForeignKey(Lote, on_delete=models.RESTRICT, related_name='anuncios', null=True, blank=True)
    cd_mat               = models.ForeignKey(MatMed, on_delete=models.RESTRICT, related_name='anuncios')
    qtd_mat              = models.IntegerField()
    val_unitario         = models.DecimalField(max_digits=10, decimal_places=2)
    cd_pessoa_anunciante = models.ForeignKey(PessoaJuridica, on_delete=models.RESTRICT, related_name='anuncios')
    ds_obs               = models.CharField(max_length=500, blank=True, default='')
    data_anuncio         = models.DateField(auto_now_add=True)
    ie_status            = models.CharField(max_length=1, choices=STATUS_CHOICES, default='A')

    class Meta:
        verbose_name = 'Anuncio'    
        verbose_name_plural = 'Anúncios'

    def __str__(self):
        return f'Anúncio {self.nr_anuncio}'