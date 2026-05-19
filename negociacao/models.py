from django.db import models
from pessoa_juridica.models import PessoaJuridica
from anuncio.models import Anuncio


class Negociacao(models.Model):

    nr_negociacao = models.AutoField(primary_key=True)

    obs_negocia = models.CharField(
        max_length=500,
        blank=True,
        default=''
    )

    qtd_matmed = models.IntegerField()

    nr_anuncio = models.ForeignKey(
        Anuncio,
        on_delete=models.RESTRICT,
        related_name='negociacoes'
    )

    cd_negociador = models.ForeignKey(
        PessoaJuridica,
        on_delete=models.RESTRICT,
        related_name='negociacoes_as_negociador'
    )

    cd_negociante = models.ForeignKey(
        PessoaJuridica,
        on_delete=models.RESTRICT,
        related_name='negociacoes_as_negociante'
    )

    def __str__(self):
        return f"Negociação {self.nr_negociacao}"
    