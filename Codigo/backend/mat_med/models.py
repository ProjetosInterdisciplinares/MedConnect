from django.db import models
from pessoa_juridica.models import PessoaJuridica

class MatMed(models.Model):

    cd_mat = models.AutoField(primary_key=True)

    ds_mat = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Nome Insumo"
    )

    ds_marca = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Marca"
    )

    CATEGORIA_CHOICES = (
        ("Material Hospitalar", "Material Hospitalar"),
        ("Medicamento", "Medicamento"),
    )

    ds_tipo = models.CharField(
        max_length=50,
        choices=CATEGORIA_CHOICES,
        blank=True,
        null=True,
        verbose_name="Categoria"
    )

    unidade_med = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Unidade de Medida"
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
        blank=False,
        null=False,
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
        return str(self.ds_mat) if self.ds_mat else str(self.cd_tuss)