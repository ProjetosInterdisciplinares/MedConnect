from django.contrib import admin

from estoque_ia.models import AnaliseEstoque


@admin.register(AnaliseEstoque)
class AnaliseEstoqueAdmin(admin.ModelAdmin):
    list_display = ('id', 'empresa', 'nome_arquivo', 'criado_em', 'periodo_inicio', 'periodo_fim',
                    'total_materiais', 'total_sugeridos', 'ia_utilizada')
    list_filter = ('ia_utilizada',)
    search_fields = ('nome_arquivo', 'empresa__nm_pessoaj', 'empresa__razao_social')
    readonly_fields = ('criado_em',)
