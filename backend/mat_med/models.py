from django.db import models
from marcas.models import Marcas
from tipo_matmed.models import TipoMatMed
from pessoa_juridica.models import PessoaJuridica

class MatMed(models.Model):

    cd_mat = models.AutoField(primary_key=True)

    ds_mat = models.CharField(
        max_length=255
    )

    ds_marca = models.ForeignKey(
        Marcas,
        on_delete=models.RESTRICT,
        related_name='materiais'
    )

    ds_tipo = models.ForeignKey(
        TipoMatMed,
        on_delete=models.RESTRICT,
        related_name='materiais'
    )

    ds_pessoaj = models.ForeignKey(
        PessoaJuridica,
        on_delete=models.RESTRICT,
        related_name='materiais'
    )

    TISS_CHOICES = (
        ("19", "Brasíndice"),
        ("20", "TUSS"),
    )

    cd_tiss = models.CharField(
        max_length=2,
        choices=TISS_CHOICES,
        blank=True,
        null=True,
        verbose_name="Tabela TISS"
    )

    cd_tuss = models.CharField(
        max_length=8,
        blank=True,
        null=True,
        verbose_name="Código TUSS"
    )

    cd_simpro = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name="Código SIMPRO"
    )

    cd_brasindice = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        verbose_name="Código Brasíndice"
    )

    def __str__(self):
        return self.ds_mat