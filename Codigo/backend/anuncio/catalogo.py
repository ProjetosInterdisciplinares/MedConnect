"""CatalogoAnuncios — contexto do padrão Strategy."""
from django.db.models import QuerySet

from anuncio.models import Anuncio, Negociacao
from anuncio.ordenacao import EstrategiaOrdenacao, PorMaisRecente


class CatalogoAnuncios:

    def __init__(self, estrategia: EstrategiaOrdenacao | None = None):
        self._estrategia = estrategia or PorMaisRecente()

    def definir_estrategia(self, estrategia: EstrategiaOrdenacao) -> None:
        self._estrategia = estrategia

    def listar(self, empresa, filtros: dict) -> QuerySet:
        Anuncio.objects.inativar_vencidos()
        Negociacao.objects.expirar_vencidas()  # anúncios com proposta sem resposta voltam ao catálogo

        anuncios = Anuncio.objects.filter(ie_status=filtros.get('status') or Anuncio.STATUS_ATIVO)
        if filtros.get('ds_mat'):
            anuncios = anuncios.filter(cd_mat__ds_mat__icontains=filtros['ds_mat'])
        if filtros.get('hospital'):
            anuncios = anuncios.filter(cd_pessoa_anunciante__nm_pessoaj__icontains=filtros['hospital'])
        if filtros.get('tipo'):
            anuncios = anuncios.filter(cd_mat__ds_tipo__icontains=filtros['tipo'])

        return self._estrategia.ordenar(anuncios, empresa)
