"""
Assinantes (Observer) do app de créditos.

ConcederBoasVindas: quando o cadastro de uma empresa é aprovado (status
passa para ATIVA), seja pelo painel de credenciamentos ou pelo Django
Admin, a empresa recebe os créditos de boas-vindas.
"""
from django.db import transaction

from app.observador import Assinante
from pessoa_juridica.models import PessoaJuridica

STATUS_APROVADO = 'ATIVA'


class ConcederBoasVindas(Assinante):
    publicadora = PessoaJuridica
    campos_observados = ('status',)

    def atualizar(self, instancia, criado):
        if not self.mudou_para(instancia, 'status', STATUS_APROVADO):
            return

        from creditos.carteira import CarteiraCreditos

        # Após o commit, para não conceder se a aprovação for desfeita
        transaction.on_commit(lambda: CarteiraCreditos(instancia).conceder_boas_vindas())
