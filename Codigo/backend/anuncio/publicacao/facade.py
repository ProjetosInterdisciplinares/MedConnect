"""
AnuncioFacade — padrão Facade.

Ponto de entrada das views para publicar anúncios. Escolhe o publicador
adequado e executa a publicação em uma única transação: se a gravação
falhar, a cobrança de créditos é desfeita.
"""
from django.db import transaction

from anuncio.models import Anuncio
from anuncio.planilha_modelo import DiretorPlanilhaModelo, PlanilhaModelo, PlanilhaXlsxBuilder
from anuncio.publicacao.publicadores import (
    PreVisualizadorPlanilha, PublicadorLote, PublicadorManual, ResultadoPublicacao,
)


class AnuncioFacade:

    def __init__(self, empresa):
        self._empresa = empresa

    def publicar_manual(self, dados: dict) -> Anuncio:
        with transaction.atomic():
            return PublicadorManual(self._empresa).processar(dados).anuncios[0]

    def pre_visualizar_planilha(self, arquivo) -> ResultadoPublicacao:
        return PreVisualizadorPlanilha(self._empresa).processar(arquivo)

    def publicar_lote(self, itens: list) -> list[Anuncio]:
        with transaction.atomic():
            return PublicadorLote(self._empresa).processar(itens).anuncios

    @staticmethod
    def baixar_modelo_planilha() -> PlanilhaModelo:
        return DiretorPlanilhaModelo(PlanilhaXlsxBuilder()).construir_modelo()
