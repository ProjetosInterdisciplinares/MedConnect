from django.contrib import admin
from negociacao.models import Negociacao

class NegociacaoAdmin(admin.ModelAdmin):
    list_display =('nr_negociacao','obs_negocia','qtd_matmed',)
    search_fields = ('nr_negociacao',)

admin.site.register(Negociacao, NegociacaoAdmin)

#Para a negociacao espera que seja buscado pelo numero, exemplo: N2013
