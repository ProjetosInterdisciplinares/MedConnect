from django.contrib import admin

from notificacoes.models import AlertaInteresse, Notificacao


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ('criada_em', 'destinatario', 'tipo', 'mensagem', 'lida')
    list_filter = ('tipo', 'lida')
    search_fields = ('destinatario__nm_pessoaj', 'mensagem')


@admin.register(AlertaInteresse)
class AlertaInteresseAdmin(admin.ModelAdmin):
    list_display = ('criado_em', 'empresa', 'termo', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('empresa__nm_pessoaj', 'termo')
