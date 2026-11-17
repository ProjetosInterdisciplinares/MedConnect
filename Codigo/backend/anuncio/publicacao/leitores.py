"""
Leitores de dados de anúncio — produtos do Factory Method.

Cada leitor sabe ler uma origem (formulário, planilha .xlsx ou lote JSON)
e entrega uma lista de DadosAnuncio, ainda sem validar regras de negócio:
isso é feito pelo AnuncioBuilder.
"""
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass

from openpyxl import load_workbook

from anuncio.planilha_modelo import ABA_ANUNCIOS, COLUNAS_PLANILHA
from anuncio.publicacao.erros import EntradaVaziaError, PlanilhaInvalidaError
from anuncio.serializers import AnuncioSerializer
from mat_med.models import MatMed

CAMPOS_CODIGO = ('cd_tuss', 'cd_simpro', 'cd_brasindice')


@dataclass
class DadosInsumo:
    ds_mat: str = ''
    ds_tipo: str = ''
    ds_marca: str = ''
    unidade_med: str = ''
    cd_tuss: str = ''
    cd_simpro: str = ''
    cd_brasindice: str = ''

    @classmethod
    def de_dict(cls, dados: dict) -> 'DadosInsumo':
        valores = {}
        for nome in cls.__dataclass_fields__:
            texto = _texto(dados.get(nome))
            if nome in CAMPOS_CODIGO and texto.endswith('.0'):
                texto = texto[:-2]  # o Excel converte códigos numéricos em float
            valores[nome] = texto
        return cls(**valores)

    def como_dict(self) -> dict:
        dados = asdict(self)
        for nome in ('cd_simpro', 'cd_brasindice'):
            dados[nome] = dados[nome] or None
        return dados


@dataclass
class DadosAnuncio:
    insumo_cadastrado: MatMed | None = None   # cadastro manual: insumo já escolhido
    insumo: DadosInsumo | None = None         # planilha e lote: dados do insumo
    ds_lote: object = None
    dt_fabricacao: object = None
    dt_validade: object = None
    qtd_mat: object = None
    val_base: object = None
    ds_obs: object = ''
    imagem_anuncio: str | None = None
    val_minimo: object = None                 # menor valor aceito pelo lote (opcional)
    ie_aceita_parcial: object = True          # aceita compra de parte do lote
    linha: int | None = None                  # linha da planilha, quando houver


def _texto(valor) -> str:
    return str(valor).strip() if valor is not None else ''


class LeitorAnuncio(ABC):

    @abstractmethod
    def ler(self, entrada) -> list[DadosAnuncio]:
        ...


class LeitorFormulario(LeitorAnuncio):
    """Cadastro manual: valida os tipos com o serializer do DRF (erros → HTTP 400)."""

    def ler(self, entrada: dict) -> list[DadosAnuncio]:
        serializer = AnuncioSerializer(data=entrada)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        return [DadosAnuncio(
            insumo_cadastrado=dados['cd_mat'],
            ds_lote=dados.get('ds_lote'),
            dt_fabricacao=dados.get('dt_fabricacao'),
            dt_validade=dados.get('dt_validade'),
            qtd_mat=dados.get('qtd_mat'),
            val_base=dados.get('val_base'),
            ds_obs=dados.get('ds_obs', ''),
            imagem_anuncio=dados.get('imagem_anuncio'),
            val_minimo=dados.get('val_minimo'),
            ie_aceita_parcial=dados.get('ie_aceita_parcial', True),
        )]


class LeitorPlanilhaXlsx(LeitorAnuncio):
    """Importação em massa: lê a aba de anúncios da planilha-modelo."""

    def ler(self, arquivo) -> list[DadosAnuncio]:
        try:
            workbook = load_workbook(arquivo, data_only=True)
        except Exception as erro:
            raise PlanilhaInvalidaError('Arquivo inválido. Envie um arquivo .xlsx válido.') from erro

        aba = self._aba_de_dados(workbook)
        posicoes = self._posicoes_das_colunas(aba)
        lidos = []
        for numero, linha in enumerate(aba.iter_rows(min_row=2, values_only=True), start=2):
            if all(_texto(celula) == '' for celula in linha):
                continue
            valores = {
                chave: (linha[i] if i is not None and i < len(linha) else None)
                for chave, i in posicoes.items()
            }
            lidos.append(DadosAnuncio(
                insumo=DadosInsumo.de_dict(valores),
                ds_lote=valores['ds_lote'],
                dt_fabricacao=valores['dt_fabricacao'],
                dt_validade=valores['dt_validade'],
                qtd_mat=valores['qtd_mat'],
                val_base=valores['val_base'],
                ds_obs=valores['ds_obs'],
                val_minimo=valores['val_minimo'],
                ie_aceita_parcial=valores['ie_aceita_parcial'],
                linha=numero,
            ))

        if not lidos:
            raise EntradaVaziaError(
                "Nenhuma linha de dados encontrada na planilha. Preencha os dados na aba 'Anúncios'."
            )
        return lidos

    @staticmethod
    def _posicoes_das_colunas(aba) -> dict:
        """Coluna de cada campo pelo título no cabeçalho; sem cabeçalho reconhecível, usa a ordem do modelo."""
        cabecalho = next(aba.iter_rows(min_row=1, max_row=1, values_only=True), ())
        titulos = [_texto(celula).lower() for celula in cabecalho]
        posicoes = {
            coluna.chave: titulos.index(coluna.titulo.lower()) if coluna.titulo.lower() in titulos else None
            for coluna in COLUNAS_PLANILHA
        }
        if all(i is None for i in posicoes.values()):
            posicoes = {coluna.chave: i for i, coluna in enumerate(COLUNAS_PLANILHA)}
        return posicoes

    @staticmethod
    def _aba_de_dados(workbook):
        if ABA_ANUNCIOS in workbook.sheetnames:
            return workbook[ABA_ANUNCIOS]
        if len(workbook.sheetnames) > 1:
            return workbook.worksheets[1]
        return workbook.active


class LeitorLoteJson(LeitorAnuncio):
    """Confirmação da importação: lista [{insumo: {...}, anuncio: {...}}] enviada pela prévia."""

    def ler(self, itens) -> list[DadosAnuncio]:
        if not isinstance(itens, list) or not itens:
            raise EntradaVaziaError('Nenhum anúncio para publicar.')

        lidos = []
        for item in itens:
            item = item if isinstance(item, dict) else {}
            insumo = item.get('insumo') if isinstance(item.get('insumo'), dict) else {}
            anuncio = item.get('anuncio') if isinstance(item.get('anuncio'), dict) else {}
            lidos.append(DadosAnuncio(
                insumo=DadosInsumo.de_dict(insumo),
                ds_lote=anuncio.get('ds_lote'),
                dt_fabricacao=anuncio.get('dt_fabricacao'),
                dt_validade=anuncio.get('dt_validade'),
                qtd_mat=anuncio.get('qtd_mat'),
                val_base=anuncio.get('val_base'),
                ds_obs=anuncio.get('ds_obs', ''),
                imagem_anuncio=anuncio.get('imagem_anuncio'),
                val_minimo=anuncio.get('val_minimo'),
                ie_aceita_parcial=anuncio.get('ie_aceita_parcial', True),
            ))
        return lidos
