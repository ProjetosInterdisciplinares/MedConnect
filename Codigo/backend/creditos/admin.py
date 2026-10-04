from django.contrib import admin
from creditos.models import PacoteCredito, TransacaoCredito


@admin.register(PacoteCredito)
class PacoteCreditoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'quantidade_creditos', 'bonus_creditos', 'preco', 'destaque', 'ativo', 'ordem')
    list_editable = ('preco', 'destaque', 'ativo', 'ordem')
    list_filter = ('ativo', 'destaque')


@admin.register(TransacaoCredito)
class TransacaoCreditoAdmin(admin.ModelAdmin):
    list_display = ('id', 'data_transacao', 'pessoa_juridica', 'tipo', 'status', 'quantidade', 'saldo_apos', 'descricao')
    list_filter = ('tipo', 'status', 'metodo_pagamento')
    search_fields = ('pessoa_juridica__nm_pessoaj', 'pessoa_juridica__nr_cnpj', 'codigo_pagamento')
    date_hierarchy = 'data_transacao'

    # Ledger imutável: alterações de saldo só via creditos.services
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
