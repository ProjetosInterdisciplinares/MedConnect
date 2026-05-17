from django.contrib import admin
from fabricante.models import Fabricante

class FabricanteAdmin(admin.ModelAdmin):
    list_display =('cd_fabricante','ds_fabricante','cnpj_fabri',)
    search_fields = ('ds_fabri',)

admin.site.register(Fabricante, FabricanteAdmin)

#Para o fabricante espera que ele seja buscado pela descrição, exemplo: Unimed,Santa Filomena
