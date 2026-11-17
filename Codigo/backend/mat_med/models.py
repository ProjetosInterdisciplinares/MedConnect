from django.db import models
from pessoa_juridica.models import PessoaJuridica

# Unidades de medida aceitas no cadastro de insumo: só a unidade, sem quantidade
# (ex.: "Caixa", e não "Caixa c/ 100"). Manter igual a frontend/src/lib/format/unidade.ts.
UNIDADES_MEDIDA = (
    'Unidade', 'Caixa', 'Pacote', 'Frasco', 'Frasco-ampola', 'Ampola', 'Bolsa',
    'Comprimido', 'Cápsula', 'Blister', 'Envelope', 'Bisnaga', 'Tubo', 'Rolo',
    'Par', 'Kit', 'Seringa', 'Galão', 'Litro', 'Mililitro', 'Grama', 'Quilograma',
)


def unidade_padronizada(valor) -> str | None:
    """Devolve a unidade da lista com a grafia oficial, ou None se não estiver na lista."""
    texto = str(valor or '').strip().lower()
    return next((u for u in UNIDADES_MEDIDA if u.lower() == texto), None)

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
        verbose_name="Tabela TISS"  # descontinuado: não é mais exibido nem editado
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

    # Código do item no catálogo de materiais do Governo Federal (CATMAT).
    # Opcional; habilita a consulta de preço de referência no Compras.gov.br.
    cd_catmat = models.CharField(
        max_length=9,
        blank=True,
        null=True,
        verbose_name="Código CATMAT"
    )

    def __str__(self):
        return str(self.ds_mat) if self.ds_mat else str(self.cd_tuss)