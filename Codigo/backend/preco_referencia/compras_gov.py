"""
Acesso aos dados abertos do Compras.gov.br — padrão Adapter.

O restante do sistema depende apenas das interfaces CatalogoPublico
(usada pela carga do catálogo) e PrecosPublicos (usada pela consulta de
preço). O ComprasGovAdapter implementa as duas sobre a API pública
dadosabertos.compras.gov.br (Lei 12.527/2011 e Decreto 8.777/2016).

Dados pessoais (LGPD): os resultados de preço trazem nome e CPF/CNPJ do
fornecedor. O adaptador descarta esses campos; eles nunca saem daqui.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

import requests


class FontePrecosError(Exception):
    """Falha ao consultar a fonte pública de preços."""


class FontePrecosIndisponivelError(FontePrecosError):
    """O serviço está fora do ar, lento ou limitou as consultas."""


@dataclass(frozen=True)
class ItemCatalogo:
    codigo: int
    descricao: str
    codigo_classe: int


@dataclass(frozen=True)
class PaginaCatalogo:
    itens: list[ItemCatalogo]
    total_paginas: int


@dataclass(frozen=True)
class PrecoPraticado:
    """Uma compra pública do item. Sem dados do fornecedor (LGPD)."""
    preco_unitario: Decimal
    unidade: str
    data_compra: str
    orgao: str
    uf: str


class CatalogoPublico(ABC):
    """O que a carga do catálogo espera: os itens de uma classe, página por página."""

    @abstractmethod
    def listar_catalogo(self, codigo_classe: int, pagina: int) -> PaginaCatalogo:
        ...


class PrecosPublicos(ABC):
    """O que a consulta de preço espera: as compras públicas de um item."""

    @abstractmethod
    def consultar_precos(self, codigo_catmat: int, desde: date) -> list[PrecoPraticado]:
        ...


class ComprasGovAdapter(CatalogoPublico, PrecosPublicos):
    """Adaptador: chama a API de dados abertos do Compras.gov.br e traduz respostas e erros."""

    URL_BASE = 'https://dadosabertos.compras.gov.br'
    URL_CATALOGO = URL_BASE + '/modulo-material/4_consultarItemMaterial'
    URL_PRECOS = URL_BASE + '/modulo-pesquisa-preco/1_consultarMaterial'
    TAMANHO_PAGINA = 500  # máximo aceito pela API
    TEMPO_LIMITE_S = 60

    def listar_catalogo(self, codigo_classe: int, pagina: int) -> PaginaCatalogo:
        dados = self._get(self.URL_CATALOGO, {
            'pagina': pagina,
            'tamanhoPagina': self.TAMANHO_PAGINA,
            'codigoClasse': codigo_classe,
            'statusItem': 'true',
        })
        itens = [
            ItemCatalogo(
                codigo=int(i['codigoItem']),
                descricao=(i.get('descricaoItem') or '').strip(),
                codigo_classe=int(i.get('codigoClasse') or codigo_classe),
            )
            for i in dados.get('resultado') or [] if i.get('codigoItem')
        ]
        return PaginaCatalogo(itens=itens, total_paginas=int(dados.get('totalPaginas') or 0))

    def consultar_precos(self, codigo_catmat: int, desde: date) -> list[PrecoPraticado]:
        dados = self._get(self.URL_PRECOS, {
            'pagina': 1,
            'tamanhoPagina': self.TAMANHO_PAGINA,
            'tipo': 'codigoItemCatalogo',
            'codigo': codigo_catmat,
            'dataCompraInicio': desde.isoformat(),
        })
        precos = []
        for r in dados.get('resultado') or []:
            preco = _decimal(r.get('precoUnitario'))
            if preco is None or preco <= 0:
                continue
            precos.append(PrecoPraticado(
                preco_unitario=preco,
                unidade=_unidade(r),
                data_compra=(r.get('dataCompra') or '')[:10],
                orgao=(r.get('nomeOrgao') or r.get('nomeUasg') or '').strip(),
                uf=(r.get('estado') or '').strip(),
            ))
        return precos

    def _get(self, url: str, parametros: dict) -> dict:
        try:
            resposta = requests.get(
                url, params=parametros, timeout=self.TEMPO_LIMITE_S,
                headers={'User-Agent': 'MedConnect/1.0', 'Accept': 'application/json'},
            )
        except requests.RequestException as erro:
            raise FontePrecosIndisponivelError('Não foi possível acessar o Compras.gov.br.') from erro

        if resposta.status_code == 400:
            raise FontePrecosError(f'O Compras.gov.br recusou a consulta: {resposta.text[:200]}')
        if resposta.status_code != 200:
            raise FontePrecosIndisponivelError(f'O Compras.gov.br respondeu {resposta.status_code}.')
        try:
            return resposta.json()
        except ValueError as erro:
            raise FontePrecosIndisponivelError('Resposta inválida do Compras.gov.br.') from erro


def _unidade(registro: dict) -> str:
    """Nem toda compra preenche a sigla; usa o primeiro campo de unidade disponível."""
    for campo in ('siglaUnidadeFornecimento', 'nomeUnidadeFornecimento', 'siglaUnidadeMedida', 'nomeUnidadeMedida'):
        valor = (registro.get(campo) or '').strip()
        if valor:
            return valor.upper()
    return ''


def _decimal(valor) -> Decimal | None:
    if valor in (None, ''):
        return None
    try:
        return Decimal(str(valor))
    except (InvalidOperation, ValueError):
        return None
