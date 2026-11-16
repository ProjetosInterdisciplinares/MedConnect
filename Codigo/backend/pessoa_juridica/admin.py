from django.contrib import admin
from pessoa_juridica.models import PessoaJuridica, VerificacaoCNPJ

class PessoaJuridicaAdmin(admin.ModelAdmin):
    list_display =('cd_pessoaj','nm_pessoaj','email_pj','resp_tec','nr_cnpj','razao_social','status','saldo_creditos',)
    search_fields = ('nm_pessoaj',)
    list_filter = ('status',)
    readonly_fields = ('saldo_creditos',)

admin.site.register(PessoaJuridica, PessoaJuridicaAdmin)


@admin.register(VerificacaoCNPJ)
class VerificacaoCNPJAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'consultado_em')
    search_fields = ('empresa__nm_pessoaj', 'empresa__nr_cnpj')
    readonly_fields = ('empresa', 'dados', 'consultado_em')
