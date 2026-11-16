"""
Consulta de preço de referência — padrão Facade.

A view chama apenas consultar(). A fachada esconde a fonte pública de
preços (Adapter), o cálculo do resumo e a cobrança de créditos.
Cobra 15 créditos somente quando a consulta traz resultados.
"""
from collections import Counter
from datetime import timedelta
from decimal import Decimal
from statistics import median

from django.utils import timezone

from creditos.acoes import ConsultarPrecoReferencia
from creditos.carteira import CarteiraCreditos
from preco_referencia.compras_gov import ComprasGovAdapter, PrecoPraticado, PrecosPublicos

JANELA_DIAS = 365
LIMITE_EXEMPLOS = 5

FONTE = 'Compras.gov.br (dados abertos do Governo Federal)'
AVISO = ('Valores praticados em compras públicas, apenas como referência. '
         'Não substituem tabelas contratuais (SIMPRO/Brasíndice).')


class InsumoSemCatmatError(Exception):
    """O insumo não tem código CATMAT; não há o que consultar."""


class ConsultaPrecoReferenciaFacade:

    def __init__(self, fonte: PrecosPublicos | None = None):
        self._fonte = fonte or ComprasGovAdapter()

    def consultar(self, empresa, material) -> dict:
        """
        Lança InsumoSemCatmatError, SaldoInsuficienteError (antes de chamar a
        fonte) ou FontePrecosError. Sem resultados, devolve encontrado=False
        e não cobra.
        """
        if not material.cd_catmat:
            raise InsumoSemCatmatError('Este insumo não tem código CATMAT cadastrado.')

        carteira = CarteiraCreditos(empresa)
        acao = ConsultarPrecoReferencia(material.ds_mat or material.cd_tuss)
        carteira.garantir_saldo(acao)

        desde = timezone.localdate() - timedelta(days=JANELA_DIAS)
        precos = self._fonte.consultar_precos(int(material.cd_catmat), desde)

        if precos:
            carteira.debitar(acao, referencia=f'MAT-{material.cd_mat}')
        return self._resumo(desde, precos)

    @staticmethod
    def _resumo(desde, precos: list[PrecoPraticado]) -> dict:
        base = {'periodo_inicio': desde.isoformat(), 'fonte': FONTE, 'aviso': AVISO}
        if not precos:
            return {**base, 'encontrado': False}

        # Compras em unidades diferentes (UN, CX, FR...) não são comparáveis:
        # o resumo usa a unidade mais frequente.
        unidade, _ = Counter(p.unidade for p in precos).most_common(1)[0]
        mesma_unidade = [p for p in precos if p.unidade == unidade]
        valores = [p.preco_unitario for p in mesma_unidade]
        recentes = sorted(mesma_unidade, key=lambda p: p.data_compra, reverse=True)[:LIMITE_EXEMPLOS]

        return {
            **base,
            'encontrado': True,
            'unidade': unidade,
            'total_compras': len(mesma_unidade),
            'menor': _texto(min(valores)),
            'mediana': _texto(median(valores)),
            'maior': _texto(max(valores)),
            'exemplos': [
                {'orgao': p.orgao, 'uf': p.uf, 'data': p.data_compra, 'preco_unitario': _texto(p.preco_unitario)}
                for p in recentes
            ],
        }


def _texto(valor: Decimal) -> str:
    """Até 4 casas decimais: itens baratos (R$ 0,0450 a unidade) não podem virar R$ 0,05."""
    return format(Decimal(valor).quantize(Decimal('0.0001')).normalize(), 'f')
