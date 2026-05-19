from django.contrib import admin
from anuncio.models import Anuncio

class AnuncioAdmin(admin.ModelAdmin):
    list_display =('data_anuncio', 'ie_status','nr_anuncio','cd_mat','cd_pessoa_anunciante', 'qtd_mat','val_unitario')
    search_fields = ('nr_anuncio',)

admin.site.register(Anuncio, AnuncioAdmin)