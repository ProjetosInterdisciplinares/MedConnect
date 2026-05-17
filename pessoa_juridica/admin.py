from django.contrib import admin
from pessoa_juridica.models import PessoaJuridica

class PessoaJuridicaAdmin(admin.ModelAdmin):
    list_display =('cd_pessoaj','nm_pessoaj','email_pj','resp_tec','nr_cnpj','razao_social',)
    search_fields = ('nm_pessoaj',)

admin.site.register(PessoaJuridica, PessoaJuridicaAdmin)

#Para a Pessoa Juridica espera que seja buscado pelo nome, exemplo: Hospital Irmandade da Santa Casa de Misericórdia de Araras
