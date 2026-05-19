from django.contrib import admin
from lote.models import Lote

class LoteAdmin(admin.ModelAdmin):
    list_display =('nr_lote','dt_fabricacao','dt_validade','qtd_lote','unidade_med',)
    search_fields = ('nr_lote',)

admin.site.register(Lote, LoteAdmin)

#Para o lote espera que ele seja buscado pelo numero do lote, exemplo: Formato Padrão: L123456