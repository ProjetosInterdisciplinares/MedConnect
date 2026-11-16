"""
Planilha-modelo da importação em massa — padrão Builder com Diretor.

O DiretorPlanilhaModelo define o conteúdo e a ordem das etapas. O
PlanilhaBuilder declara as etapas, e o PlanilhaXlsxBuilder as executa com
openpyxl. COLUNAS_PLANILHA é a fonte única das colunas: o leitor da
importação (anuncio.publicacao.leitores) usa a mesma definição.
"""
import io
from abc import ABC, abstractmethod
from dataclasses import dataclass

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ABA_TUTORIAL = 'Tutorial'
ABA_ANUNCIOS = 'Anúncios'
MARCA_OBRIGATORIO = '(*)'


@dataclass(frozen=True)
class ColunaPlanilha:
    chave: str
    titulo: str
    largura: int
    eh_data: bool = False

    @property
    def obrigatoria(self) -> bool:
        return MARCA_OBRIGATORIO in self.titulo


COLUNAS_PLANILHA = (
    ColunaPlanilha('ds_mat', 'Nome do Insumo (*)', 30),
    ColunaPlanilha('ds_tipo', 'Categoria do Insumo (*)', 25),
    ColunaPlanilha('ds_marca', 'Marca do Insumo (*)', 20),
    ColunaPlanilha('unidade_med', 'Unidade de Medida (*)', 20),
    ColunaPlanilha('cd_tuss', 'Código TUSS (*)', 18),
    ColunaPlanilha('cd_tiss', 'Tabela TISS', 15),
    ColunaPlanilha('cd_simpro', 'Código SIMPRO', 18),
    ColunaPlanilha('cd_brasindice', 'Código Brasíndice', 18),
    ColunaPlanilha('ds_lote', 'Lote (*)', 15),
    ColunaPlanilha('dt_fabricacao', 'Data de Fabricação (*)', 22, eh_data=True),
    ColunaPlanilha('dt_validade', 'Data de Validade (*)', 22, eh_data=True),
    ColunaPlanilha('qtd_mat', 'Quantidade (*)', 15),
    ColunaPlanilha('val_base', 'Valor Base R$ (*)', 18),
    ColunaPlanilha('ds_obs', 'Observações (*)', 50),
)


@dataclass(frozen=True)
class PlanilhaModelo:
    """Produto do builder."""
    conteudo: bytes
    nome_arquivo: str = 'template_anuncios_massa.xlsx'
    content_type: str = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


class PlanilhaBuilder(ABC):

    @abstractmethod
    def adicionar_titulo(self, texto: str) -> None: ...

    @abstractmethod
    def adicionar_secao(self, titulo: str, itens: list[tuple[str, str]]) -> None: ...

    @abstractmethod
    def adicionar_cabecalhos(self, colunas: tuple[ColunaPlanilha, ...]) -> None: ...

    @abstractmethod
    def formatar_linhas(self, quantidade: int) -> None: ...

    @abstractmethod
    def congelar_cabecalho(self) -> None: ...

    @abstractmethod
    def obter_resultado(self) -> PlanilhaModelo: ...


class PlanilhaXlsxBuilder(PlanilhaBuilder):
    AZUL = '1E3A5F'
    FONTE = 'Calibri'

    def __init__(self):
        self._workbook = Workbook()
        self._tutorial = self._workbook.active
        self._tutorial.title = ABA_TUTORIAL
        self._tutorial.column_dimensions['A'].width = 30
        self._tutorial.column_dimensions['B'].width = 80
        self._linha_tutorial = 1
        self._dados = None
        self._colunas: tuple[ColunaPlanilha, ...] = ()
        borda = Side(style='thin', color='CCCCCC')
        self._borda = Border(left=borda, right=borda, top=borda, bottom=borda)

    def adicionar_titulo(self, texto: str) -> None:
        self._tutorial.merge_cells(f'A{self._linha_tutorial}:B{self._linha_tutorial}')
        celula = self._tutorial.cell(row=self._linha_tutorial, column=1, value=texto)
        celula.font = Font(name=self.FONTE, bold=True, size=14, color='FFFFFF')
        celula.fill = self._preenchimento(self.AZUL)
        celula.alignment = Alignment(horizontal='center', vertical='center')
        self._tutorial.row_dimensions[self._linha_tutorial].height = 40
        self._linha_tutorial += 1

    def adicionar_secao(self, titulo: str, itens: list[tuple[str, str]]) -> None:
        self._linha_tutorial += 1  # linha em branco antes da seção
        fonte_secao = Font(name=self.FONTE, bold=True, size=12, color=self.AZUL)
        for celula in self._escrever_tutorial(titulo, ''):
            celula.font = fonte_secao

        for campo, explicacao in itens:
            celula_campo, celula_texto = self._escrever_tutorial(campo, explicacao)
            celula_texto.font = Font(name=self.FONTE, size=11)
            if MARCA_OBRIGATORIO in campo:
                celula_campo.font = Font(name=self.FONTE, size=11, color='CC0000', bold=True)
            else:
                celula_campo.font = Font(name=self.FONTE, size=11, bold=True)

    def adicionar_cabecalhos(self, colunas: tuple[ColunaPlanilha, ...]) -> None:
        self._dados = self._workbook.create_sheet(ABA_ANUNCIOS)
        self._colunas = colunas
        for indice, coluna in enumerate(colunas, start=1):
            celula = self._dados.cell(row=1, column=indice, value=coluna.titulo)
            celula.font = Font(name=self.FONTE, bold=True, size=11, color='FFFFFF')
            celula.fill = self._preenchimento(self.AZUL)
            celula.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            celula.border = self._borda
            self._dados.column_dimensions[get_column_letter(indice)].width = coluna.largura
        self._dados.row_dimensions[1].height = 35

    def formatar_linhas(self, quantidade: int) -> None:
        obrigatoria = self._preenchimento('FFF3CD')
        opcional = self._preenchimento('F0F4F8')
        for linha in range(2, quantidade + 2):
            for indice, coluna in enumerate(self._colunas, start=1):
                celula = self._dados.cell(row=linha, column=indice)
                celula.border = self._borda
                celula.fill = obrigatoria if coluna.obrigatoria else opcional
                if not coluna.eh_data:
                    celula.number_format = '@'  # texto, para o Excel não converter códigos

    def congelar_cabecalho(self) -> None:
        self._dados.freeze_panes = 'A2'

    def obter_resultado(self) -> PlanilhaModelo:
        buffer = io.BytesIO()
        self._workbook.save(buffer)
        return PlanilhaModelo(conteudo=buffer.getvalue())

    # ── Auxiliares ────────────────────────────────────────────────────

    def _escrever_tutorial(self, coluna_a: str, coluna_b: str):
        celula_a = self._tutorial.cell(row=self._linha_tutorial, column=1, value=coluna_a)
        celula_b = self._tutorial.cell(row=self._linha_tutorial, column=2, value=coluna_b)
        celula_b.alignment = Alignment(wrap_text=True)
        self._linha_tutorial += 1
        return celula_a, celula_b

    @staticmethod
    def _preenchimento(cor: str) -> PatternFill:
        return PatternFill(start_color=cor, end_color=cor, fill_type='solid')


class DiretorPlanilhaModelo:
    LINHAS_PRE_FORMATADAS = 100

    def __init__(self, builder: PlanilhaBuilder):
        self._builder = builder

    def construir_modelo(self) -> PlanilhaModelo:
        b = self._builder
        b.adicionar_titulo('Tutorial de Importação em Massa - MedConnect')
        b.adicionar_secao('COMO USAR', [
            ('Passo 1', "Vá para a aba 'Anúncios' e preencha os dados de cada anúncio em uma linha."),
            ('Passo 2', 'Campos marcados com (*) são OBRIGATÓRIOS. Os demais são opcionais.'),
            ('Passo 3', 'Salve o arquivo e faça upload na plataforma.'),
            ('Passo 4', 'O sistema irá validar os dados e mostrar uma prévia antes de publicar.'),
        ])
        b.adicionar_secao('CAMPOS DO ANÚNCIO', [
            ('Nome do Insumo (*)', 'Nome do material/medicamento. Se já existir um insumo cadastrado com mesmo nome, ele será vinculado automaticamente.'),
            ('Categoria do Insumo (*)', "Tipo do insumo. Valores aceitos: 'Material Hospitalar' ou 'Medicamento'."),
            ('Marca do Insumo (*)', 'Marca/fabricante do insumo.'),
            ('Unidade de Medida (*)', 'Ex: Caixa, Unidade, Frasco, Ampola, Comprimido.'),
            ('Código TUSS (*)', 'Código TUSS do insumo (até 8 dígitos). Obrigatório para identificação.'),
            ('Tabela TISS', "Opcional. Valores aceitos: '19' (Brasíndice) ou '20' (TUSS)."),
            ('Código SIMPRO', 'Opcional. Código SIMPRO do insumo.'),
            ('Código Brasíndice', 'Opcional. Código Brasíndice do insumo.'),
            ('Lote (*)', 'Identificação do lote do produto. Ex: L123456.'),
            ('Data de Fabricação (*)', 'Formato: DD/MM/AAAA. Ex: 01/06/2025.'),
            ('Data de Validade (*)', 'Formato: DD/MM/AAAA. Ex: 01/06/2026.'),
            ('Quantidade (*)', 'Quantidade disponível do insumo (número inteiro positivo).'),
            ('Valor Base R$ (*)', 'Valor unitário de venda. Use vírgula para decimais. Ex: 15,90.'),
            ('Observações (*)', "Descrição ou observações sobre o anúncio. Ex: 'Produto lacrado, em perfeito estado'."),
        ])
        b.adicionar_secao('REGRAS IMPORTANTES', [
            ('Insumos', 'Se o código TUSS do insumo já existir no seu cadastro, o sistema reutiliza. Caso contrário, cria automaticamente.'),
            ('Datas', 'Use o formato DD/MM/AAAA ou deixe o Excel reconhecer como data.'),
            ('Valores', 'Use vírgula ou ponto para separar decimais. Ex: 15,90 ou 15.90.'),
            ('Linhas em branco', 'Linhas completamente vazias serão ignoradas.'),
        ])
        b.adicionar_cabecalhos(COLUNAS_PLANILHA)
        b.formatar_linhas(self.LINHAS_PRE_FORMATADAS)
        b.congelar_cabecalho()
        return b.obter_resultado()
