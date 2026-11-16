from django.contrib import admin

from preco_referencia.models import ItemCatmat


@admin.register(ItemCatmat)
class ItemCatmatAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'descricao', 'codigo_classe')
    list_filter = ('codigo_classe',)
    search_fields = ('codigo', 'descricao')
