"""
Publicadores de anúncio — padrões Template Method e Factory Method.

PublicadorAnuncio.processar() é o método padrão: fixa a sequência
ler → montar → (gancho) → validar → cobrar → salvar. As subclasses
mudam apenas as etapas que variam:

- criar_leitor() é o método fábrica: cada subclasse cria o seu leitor;
- deve_persistir() é um gancho: a prévia da planilha para antes de cobrar;
- criar_acao_paga() é uma etapa opcional: o lote cobra por anúncio.
"""
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field

from anuncio.models import Anuncio
from anuncio.publicacao.builder import AnuncioBuilder
from anuncio.publicacao.erros import AnuncioInvalidoError, PublicacaoInvalidaError
from anuncio.publicacao.insumos import CatalogoInsumos
from anuncio.publicacao.leitores import (
    DadosAnuncio, LeitorAnuncio, LeitorFormulario, LeitorLoteJson, LeitorPlanilhaXlsx,
)
from creditos.acoes import AcaoPaga, PublicacaoEmLote, PublicarAnuncio
from creditos.carteira import CarteiraCreditos
from mat_med.models import MatMed


@dataclass
class ItemPublicacao:
    indice: int
    dados: DadosAnuncio
    valores: dict
    insumo_cadastrado: MatMed | None = None
    anuncio: Anuncio | None = None
    erros: list[str] = field(default_factory=list)

    @property
    def valido(self) -> bool:
        return not self.erros


@dataclass
class ResultadoPublicacao:
    itens: list[ItemPublicacao]
    anuncios: list[Anuncio] = field(default_factory=list)

    @property
    def invalidos(self) -> list[ItemPublicacao]:
        return [item for item in self.itens if not item.valido]


class PublicadorAnuncio(ABC):
    # Passo opcional: a planilha exige lote, datas e observações (campos "(*)")
    exigir_dados_completos = False

    def __init__(self, empresa, carteira: CarteiraCreditos | None = None):
        self._empresa = empresa
        self._carteira = carteira or CarteiraCreditos(empresa)

    def processar(self, entrada) -> ResultadoPublicacao:
        """Método padrão: a ordem das etapas não muda entre as subclasses."""
        leitor = self.criar_leitor()
        catalogo = CatalogoInsumos(self._empresa)
        itens = [self.montar(i, dados, catalogo) for i, dados in enumerate(leitor.ler(entrada))]
        resultado = ResultadoPublicacao(itens)

        if not self.deve_persistir():
            return resultado

        self.validar(resultado)
        self.cobrar(len(itens))
        self.salvar(resultado)
        return resultado

    # ── Etapas que variam ─────────────────────────────────────────────

    @abstractmethod
    def criar_leitor(self) -> LeitorAnuncio:
        """Método fábrica."""

    def deve_persistir(self) -> bool:
        """Gancho: True grava e cobra; False devolve só a prévia."""
        return True

    def criar_acao_paga(self, quantidade: int) -> AcaoPaga:
        return PublicarAnuncio()

    # ── Etapas comuns ─────────────────────────────────────────────────

    def montar(self, indice: int, dados: DadosAnuncio, catalogo: CatalogoInsumos) -> ItemPublicacao:
        builder = AnuncioBuilder(self._empresa)
        insumo_cadastrado = dados.insumo_cadastrado

        if insumo_cadastrado is not None:
            builder.com_insumo(insumo_cadastrado)
        elif dados.insumo is not None:
            insumo_cadastrado = catalogo.cadastrado(dados.insumo.cd_tuss)
            reaproveitado = catalogo.buscar(dados.insumo.cd_tuss)
            if reaproveitado is not None:
                builder.com_insumo(reaproveitado)
            else:
                builder.com_novo_insumo(**asdict(dados.insumo))

        builder.com_lote(dados.ds_lote, dados.dt_fabricacao, dados.dt_validade,
                         obrigatorio=self.exigir_dados_completos)
        builder.com_valores(dados.qtd_mat, dados.val_base)
        builder.com_condicoes(dados.val_minimo, dados.ie_aceita_parcial)
        builder.com_descricao(dados.ds_obs, obrigatoria=self.exigir_dados_completos)
        builder.com_imagem(dados.imagem_anuncio)

        item = ItemPublicacao(indice, dados, valores=builder.valores(), insumo_cadastrado=insumo_cadastrado)
        try:
            item.anuncio = builder.construir()
        except AnuncioInvalidoError as erro:
            item.erros = erro.erros
            return item

        if item.anuncio.cd_mat.pk is None:
            catalogo.registrar_novo(item.anuncio.cd_mat)
        return item

    def validar(self, resultado: ResultadoPublicacao) -> None:
        if resultado.invalidos:
            raise PublicacaoInvalidaError(resultado.invalidos)

    def cobrar(self, quantidade: int) -> None:
        self._carteira.debitar(self.criar_acao_paga(quantidade))

    def salvar(self, resultado: ResultadoPublicacao) -> None:
        for item in resultado.itens:
            insumo = item.anuncio.cd_mat
            if insumo.pk is None:
                insumo.save()
            item.anuncio.save()
            resultado.anuncios.append(item.anuncio)


class PublicadorManual(PublicadorAnuncio):
    def criar_leitor(self) -> LeitorAnuncio:
        return LeitorFormulario()


class PreVisualizadorPlanilha(PublicadorAnuncio):
    exigir_dados_completos = True

    def criar_leitor(self) -> LeitorAnuncio:
        return LeitorPlanilhaXlsx()

    def deve_persistir(self) -> bool:
        return False


class PublicadorLote(PublicadorAnuncio):
    exigir_dados_completos = True

    def criar_leitor(self) -> LeitorAnuncio:
        return LeitorLoteJson(self._empresa)

    def criar_acao_paga(self, quantidade: int) -> AcaoPaga:
        return PublicacaoEmLote(PublicarAnuncio(), quantidade)
