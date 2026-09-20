from django.contrib import admin
from pessoa_juridica.models import PessoaJuridica

class PessoaJuridicaAdmin(admin.ModelAdmin):
    list_display =('cd_pessoaj','nm_pessoaj','email_pj','resp_tec','nr_cnpj','razao_social','status',)
    search_fields = ('nm_pessoaj',)
    list_filter = ('status',)

admin.site.register(PessoaJuridica, PessoaJuridicaAdmin)
