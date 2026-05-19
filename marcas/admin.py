from django.contrib import admin

from marcas.models import Marcas

class MarcasAdmin(admin.ModelAdmin):
    list_display =('ds_marca','cd_marca',)
    search_fields = ('ds_marca',)

admin.site.register(Marcas, MarcasAdmin)

#Para marcas espera que ele seja buscado pela descrição, exemplo: descarpack, Riohex...