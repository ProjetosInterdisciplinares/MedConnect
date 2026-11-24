"""
Histórico das análises de estoque.

Cada análise guarda um retrato do estoque (saldo, consumo e cobertura por
material) no momento do envio, junto com as sugestões e os alertas. Assim
a instituição consulta como o estoque estava antes e compara a evolução
entre uma planilha e outra, sem precisar reenviar arquivos antigos.
"""
from django.db import models

from pessoa_juridica.models import PessoaJuridica


class AnaliseEstoque(models.Model):
    LIMITE_POR_EMPRESA = 30  # as mais antigas são removidas ao passar disso

    empresa = models.ForeignKey(PessoaJuridica, on_delete=models.CASCADE, related_name='analises_estoque')
    criado_em = models.DateTimeField(auto_now_add=True)
    nome_arquivo = models.CharField(max_length=255, blank=True, default='')

    periodo_inicio = models.DateField()
    periodo_fim = models.DateField()
    dias_periodo = models.PositiveIntegerField()
    horizonte_dias = models.PositiveIntegerField(default=180)

    total_movimentacoes = models.PositiveIntegerField(default=0)
    total_materiais = models.PositiveIntegerField(default=0)
    total_sugeridos = models.PositiveIntegerField(default=0)

    ia_utilizada = models.BooleanField(default=False)
    creditos_cobrados = models.PositiveIntegerField(default=0)
    resumo_ia = models.TextField(blank=True, default='')
    recomendacoes = models.JSONField(default=list, blank=True)

    indicadores = models.JSONField(default=dict, blank=True)
    alertas = models.JSONField(default=list, blank=True)
    itens = models.JSONField(default=list, blank=True)

    analise_anterior = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    # SHA-256 do arquivo: a mesma planilha enviada de novo substitui a análise anterior
    hash_arquivo = models.CharField(max_length=64, blank=True, default='', db_index=True)

    class Meta:
        ordering = ('-criado_em', '-id')
        verbose_name = 'Análise de estoque'
        verbose_name_plural = 'Análises de estoque'
        indexes = [models.Index(fields=('empresa', '-criado_em'))]

    def __str__(self):
        return f'{self.empresa} — {self.nome_arquivo} ({self.criado_em:%d/%m/%Y %H:%M})'
