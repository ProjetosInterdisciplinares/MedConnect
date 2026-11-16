from django.db import models


class ItemCatmat(models.Model):
    """
    Cópia local de um item do catálogo de materiais do Governo Federal (CATMAT).

    A API do Compras.gov.br não busca itens por nome, só lista por classe.
    Por isso o catálogo das classes de saúde é carregado para cá
    (python manage.py carregar_catmat) e a busca por nome é feita localmente.
    """
    codigo = models.PositiveIntegerField(primary_key=True, verbose_name='Código CATMAT')
    descricao = models.TextField(verbose_name='Descrição')
    # Descrição normalizada (maiúsculas, sem acentos, "20ML" → "20 ML") usada na busca
    descricao_busca = models.TextField(editable=False)
    codigo_classe = models.PositiveIntegerField(db_index=True)

    class Meta:
        verbose_name = 'Item do catálogo CATMAT'
        verbose_name_plural = 'Itens do catálogo CATMAT'

    def __str__(self):
        return f'{self.codigo} – {self.descricao[:80]}'
