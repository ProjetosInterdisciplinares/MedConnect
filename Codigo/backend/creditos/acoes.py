"""
Ações pagas com créditos — padrão Decorator.

AcaoPaga é o componente. PublicarAnuncio, GerarDescricaoIA e
ConsultarPrecoReferencia são os componentes concretos, com custo fixo. DecoradorAcao envolve outra ação
e repassa custo e descrição; os decoradores concretos acrescentam
comportamento (PublicacaoEmLote multiplica o custo pela quantidade).
Uma nova funcionalidade paga entra como uma nova classe, sem alterar as
existentes.
"""
from abc import ABC, abstractmethod


class AcaoPaga(ABC):

    @property
    @abstractmethod
    def codigo(self) -> str:
        """Identificador gravado no extrato (TransacaoCredito.funcionalidade)."""

    @abstractmethod
    def custo(self) -> int:
        ...

    @abstractmethod
    def descricao(self) -> str:
        ...


class PublicarAnuncio(AcaoPaga):
    CODIGO = 'PUBLICAR_ANUNCIO'
    CUSTO = 5

    @property
    def codigo(self) -> str:
        return self.CODIGO

    def custo(self) -> int:
        return self.CUSTO

    def descricao(self) -> str:
        return 'Publicação de novo anúncio no catálogo'


class GerarDescricaoIA(AcaoPaga):
    CODIGO = 'IA_DESCRICAO'
    CUSTO = 1

    def __init__(self, nome_material: str | None = None):
        self._nome_material = nome_material

    @property
    def codigo(self) -> str:
        return self.CODIGO

    def custo(self) -> int:
        return self.CUSTO

    def descricao(self) -> str:
        if self._nome_material:
            return f'Geração de descrição com IA para {self._nome_material}'
        return 'Geração de descrição com IA'


class ConsultarPrecoReferencia(AcaoPaga):
    """Consulta de preços praticados em compras públicas (Compras.gov.br)."""
    CODIGO = 'PRECO_REFERENCIA'
    CUSTO = 15

    def __init__(self, nome_material: str | None = None):
        self._nome_material = nome_material

    @property
    def codigo(self) -> str:
        return self.CODIGO

    def custo(self) -> int:
        return self.CUSTO

    def descricao(self) -> str:
        if self._nome_material:
            return f'Consulta de preço de referência para {self._nome_material}'
        return 'Consulta de preço de referência (Compras.gov.br)'


class AnalisarEstoqueIA(AcaoPaga):
    """Análise da planilha de movimentação de estoque com IA (sugestão do que anunciar)."""
    CODIGO = 'IA_ANALISE_ESTOQUE'
    CUSTO = 3

    def __init__(self, nome_arquivo: str | None = None):
        self._nome_arquivo = nome_arquivo

    @property
    def codigo(self) -> str:
        return self.CODIGO

    def custo(self) -> int:
        return self.CUSTO

    def descricao(self) -> str:
        if self._nome_arquivo:
            return f'Análise de estoque com IA ({self._nome_arquivo})'
        return 'Análise de estoque com IA'


class DecoradorAcao(AcaoPaga):
    """Decorador base: guarda a ação envolvida e delega tudo a ela."""

    def __init__(self, acao: AcaoPaga):
        self._acao = acao

    @property
    def codigo(self) -> str:
        return self._acao.codigo

    def custo(self) -> int:
        return self._acao.custo()

    def descricao(self) -> str:
        return self._acao.descricao()


class PublicacaoEmLote(DecoradorAcao):
    """Aplica a ação envolvida a vários itens de uma vez."""

    def __init__(self, acao: AcaoPaga, quantidade: int):
        super().__init__(acao)
        if quantidade <= 0:
            raise ValueError('A quantidade do lote deve ser positiva.')
        self._quantidade = quantidade

    def custo(self) -> int:
        return self._acao.custo() * self._quantidade

    def descricao(self) -> str:
        return f'{self._acao.descricao()} (em massa: {self._quantidade} anúncios)'


# Ações exibidas na tabela de custos (GET /creditos/custos/)
ACOES_COM_CUSTO = (PublicarAnuncio, GerarDescricaoIA, ConsultarPrecoReferencia, AnalisarEstoqueIA)


def tabela_de_custos() -> list[dict]:
    return [
        {'codigo': acao.CODIGO, 'descricao': acao().descricao(), 'custo': acao.CUSTO}
        for acao in ACOES_COM_CUSTO
    ]
