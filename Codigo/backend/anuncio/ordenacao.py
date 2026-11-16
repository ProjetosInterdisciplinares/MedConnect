"""
Estratégias de ordenação do catálogo — padrão Strategy.

Cada critério de ordenação é uma classe com o mesmo método ordenar().
O catálogo recebe a estratégia escolhida na tela e delega a ela, sem
condicionais. Um novo critério é uma nova classe registrada em ESTRATEGIAS.
"""
import math
from abc import ABC, abstractmethod

from django.db.models import BooleanField, Case, F, FloatField, Q, QuerySet, Value, When
from django.db.models.functions import ACos, Cast, Cos, Greatest, Least, Radians, Sin

RAIO_TERRA_KM = 6371.0


class EstrategiaOrdenacao(ABC):

    @abstractmethod
    def ordenar(self, anuncios: QuerySet, empresa) -> QuerySet:
        ...


class PorMaisRecente(EstrategiaOrdenacao):
    def ordenar(self, anuncios, empresa):
        return anuncios.order_by('-nr_anuncio')


class PorRecomendacaoIA(EstrategiaOrdenacao):
    """Anúncios que combinam com os interesses da empresa (gerados pela IA) vêm primeiro."""

    def ordenar(self, anuncios, empresa):
        tags = [t.strip() for t in (getattr(empresa, 'interesses_ia', None) or '').split(',') if t.strip()]
        if not tags:
            return PorMaisRecente().ordenar(anuncios, empresa)

        combina = Q()
        for tag in tags:
            combina |= Q(cd_mat__ds_mat__icontains=tag) | Q(cd_mat__ds_tipo__icontains=tag)

        return anuncios.annotate(
            is_recommended=Case(When(combina, then=Value(True)), default=Value(False), output_field=BooleanField()),
        ).order_by('-is_recommended', '-nr_anuncio')


class PorMenorPreco(EstrategiaOrdenacao):
    def ordenar(self, anuncios, empresa):
        return anuncios.order_by('val_base', '-nr_anuncio')


class PorValidadeProxima(EstrategiaOrdenacao):
    def ordenar(self, anuncios, empresa):
        return anuncios.order_by(F('dt_validade').asc(nulls_last=True), '-nr_anuncio')


class PorDistancia(EstrategiaOrdenacao):
    """Mais próximos primeiro, pela distância em linha reta entre as instituições."""

    def ordenar(self, anuncios, empresa):
        if getattr(empresa, 'latitude', None) is None or getattr(empresa, 'longitude', None) is None:
            return PorMaisRecente().ordenar(anuncios, empresa)

        return anuncios.annotate(
            distancia_km=self._distancia_km(float(empresa.latitude), float(empresa.longitude)),
        ).order_by(F('distancia_km').asc(nulls_last=True), '-nr_anuncio')

    @staticmethod
    def _distancia_km(latitude: float, longitude: float):
        """Fórmula de haversine (lei dos cossenos esféricos), calculada no banco."""
        lat = math.radians(latitude)
        lat_anunciante = Radians(Cast('cd_pessoa_anunciante__latitude', FloatField()))
        lon_anunciante = Radians(Cast('cd_pessoa_anunciante__longitude', FloatField()))
        cosseno = (
            Value(math.cos(lat)) * Cos(lat_anunciante) * Cos(lon_anunciante - Value(math.radians(longitude)))
            + Value(math.sin(lat)) * Sin(lat_anunciante)
        )
        # Limita a [-1, 1] para o ACOS não falhar por arredondamento
        return ACos(Least(Greatest(cosseno, Value(-1.0)), Value(1.0))) * Value(RAIO_TERRA_KM)


ESTRATEGIAS: dict[str, type[EstrategiaOrdenacao]] = {
    'recomendados': PorRecomendacaoIA,
    'recentes': PorMaisRecente,
    'menor_preco': PorMenorPreco,
    'validade': PorValidadeProxima,
    'distancia': PorDistancia,
}


def estrategia_por_nome(nome: str | None) -> EstrategiaOrdenacao:
    return ESTRATEGIAS.get(nome or '', PorMaisRecente)()
