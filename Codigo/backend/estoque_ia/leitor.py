"""
Leitura da planilha de movimentação de estoque (.xlsx ou .csv).

Aceita a planilha-modelo do MedConnect e também exportações de ERP com
outros nomes de coluna (ex.: CD_MATERIAL, DS_MATERIAL,
DT_MOVIMENTO_ESTOQUE, OPERA_ESTO, QTD_MOVIMENTO): os cabeçalhos são
reconhecidos por apelidos. As abas são encontradas pelo conteúdo do
cabeçalho, não pela posição.

Erros que impedem a análise viram PlanilhaEstoqueInvalidaError; problemas
em linhas isoladas viram alertas e a linha é ignorada.
"""
import csv
import io
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from openpyxl import load_workbook

from estoque_ia import tipos
from estoque_ia.tipos import normalizar

TAMANHO_MAXIMO_MB = 30
LIMITE_LINHAS = 500_000
LINHAS_PROCURA_CABECALHO = 15
EXEMPLOS_POR_ALERTA = 5


class PlanilhaEstoqueInvalidaError(Exception):
    """A planilha não pode ser analisada (formato, colunas ou conteúdo)."""


@dataclass(frozen=True)
class Coluna:
    chave: str
    titulo: str
    largura: int
    obrigatoria: bool = False
    apelidos: tuple[str, ...] = ()
    explicacao: str = ''


COLUNAS_MOVIMENTACAO = (
    Coluna('codigo', 'Código do Material', 18, apelidos=(
        'cd_material', 'codigo', 'cod_material', 'cod', 'codigo_material', 'cd_mat', 'id_material', 'sku', 'cod_produto',
    ), explicacao='Opcional, mas recomendado: identifica o item mesmo que a descrição mude.'),
    Coluna('descricao', 'Descrição do Material', 50, True, (
        'ds_material', 'descricao', 'material', 'nome', 'produto', 'item', 'insumo', 'nome_do_insumo', 'ds_mat', 'desc_material',
    ), 'Nome do material ou medicamento, igual ao do seu sistema.'),
    Coluna('data', 'Data da Movimentação', 22, True, (
        'dt_movimento_estoque', 'data', 'data_movimento', 'dt_movimento', 'data_movimentacao', 'dt_movimentacao', 'dt_mov',
    ), 'Formato DD/MM/AAAA (ou data do Excel).'),
    Coluna('tipo', 'Tipo de Movimentação', 40, True, (
        'opera_esto', 'tipo', 'operacao', 'tipo_movimento', 'tipo_movimentacao', 'ds_operacao', 'operacao_estoque', 'tipo_operacao',
    ), 'Use a lista suspensa ou o texto do seu sistema (ex.: "Saída - Dispensação por Prescrição").'),
    Coluna('quantidade', 'Quantidade', 14, True, (
        'qtd_movimento', 'quantidade', 'qtd', 'qtde', 'quant', 'qt_movimento', 'qtd_mov',
    ), 'Quantidade movimentada, na unidade de consumo (número positivo).'),
    Coluna('unidade', 'Unidade de Medida', 18, apelidos=(
        'unidade', 'un', 'und', 'unidade_medida', 'unid', 'ds_unidade',
    ), explicacao='Opcional. Ex.: Unidade, Ampola, Frasco, Caixa.'),
    Coluna('lote', 'Lote', 16, apelidos=('lote', 'nr_lote', 'ds_lote', 'numero_lote'),
           explicacao='Opcional. Lote recebido nas entradas.'),
    Coluna('validade', 'Data de Validade', 20, apelidos=(
        'validade', 'dt_validade', 'vencimento', 'data_validade', 'dt_vencimento', 'data_de_vencimento',
    ), explicacao='Opcional. Validade do lote recebido nas entradas: melhora o cálculo de risco de vencimento.'),
)

COLUNAS_SALDO = (
    Coluna('codigo', 'Código do Material', 18, apelidos=COLUNAS_MOVIMENTACAO[0].apelidos,
           explicacao='Opcional. O mesmo código usado na aba Movimentações.'),
    Coluna('descricao', 'Descrição do Material', 50, True, COLUNAS_MOVIMENTACAO[1].apelidos,
           'A mesma descrição usada na aba Movimentações.'),
    Coluna('saldo', 'Saldo Atual', 14, True, (
        'saldo', 'saldo_atual', 'qtd_saldo', 'qtd_estoque', 'estoque', 'estoque_atual', 'quantidade_em_estoque', 'qt_estoque',
    ), 'Quantidade em estoque hoje (por lote, se possível).'),
    Coluna('unidade', 'Unidade de Medida', 18, apelidos=COLUNAS_MOVIMENTACAO[5].apelidos, explicacao='Opcional.'),
    Coluna('lote', 'Lote', 16, apelidos=COLUNAS_MOVIMENTACAO[6].apelidos, explicacao='Opcional. Uma linha por lote.'),
    Coluna('validade', 'Data de Validade', 20, apelidos=COLUNAS_MOVIMENTACAO[7].apelidos,
           explicacao='Recomendado. Sem validade, a IA usa um horizonte fixo para estimar a sobra.'),
    Coluna('valor_unitario', 'Valor Unitário (R$)', 18, apelidos=(
        'valor_unitario', 'vl_unitario', 'custo_unitario', 'preco_unitario', 'custo_medio', 'vl_custo', 'valor',
    ), explicacao='Opcional. Permite estimar o valor parado em estoque (R$).'),
)

OBRIGATORIAS_MOVIMENTACAO = {c.chave for c in COLUNAS_MOVIMENTACAO if c.obrigatoria}
OBRIGATORIAS_SALDO = {c.chave for c in COLUNAS_SALDO if c.obrigatoria}


@dataclass
class Movimentacao:
    linha: int
    codigo: str
    descricao: str
    data: date
    tipo: str
    categoria: str
    quantidade: float
    unidade: str = ''
    lote: str = ''
    validade: date | None = None


@dataclass
class SaldoLote:
    linha: int
    codigo: str
    descricao: str
    saldo: float
    unidade: str = ''
    lote: str = ''
    validade: date | None = None
    valor_unitario: float | None = None


@dataclass
class Alerta:
    nivel: str  # 'critico' | 'aviso' | 'info'
    titulo: str
    mensagem: str
    detalhes: list[str] = field(default_factory=list)

    def como_dict(self) -> dict:
        return {'nivel': self.nivel, 'titulo': self.titulo, 'mensagem': self.mensagem, 'detalhes': self.detalhes}


@dataclass
class LeituraEstoque:
    movimentacoes: list[Movimentacao]
    saldos: list[SaldoLote]
    alertas: list[Alerta]
    aba_movimentacoes: str
    tem_aba_saldo: bool
    linhas_lidas: int


# ── Conversão de valores ─────────────────────────────────────────────

FORMATOS_DATA = ('%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d', '%d-%m-%Y', '%d-%m-%y', '%d.%m.%Y', '%Y/%m/%d')
EPOCA_EXCEL = date(1899, 12, 30)


def converter_data(valor) -> date | None:
    if valor is None or valor == '':
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    if isinstance(valor, (int, float)):
        if 20000 < valor < 80000:  # número de série do Excel
            return EPOCA_EXCEL + timedelta(days=int(valor))
        return None
    texto = str(valor).strip().split(' ')[0].split('T')[0]
    for formato in FORMATOS_DATA:
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None


def converter_numero(valor) -> float | None:
    if valor is None or valor == '':
        return None
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = re.sub(r'[^\d,.\-]', '', str(valor))
    if not texto:
        return None
    if ',' in texto:  # formato brasileiro: 1.234,56
        texto = texto.replace('.', '').replace(',', '.')
    try:
        return float(texto)
    except ValueError:
        return None


def texto(valor) -> str:
    if valor is None:
        return ''
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    return str(valor).strip()


# ── Cabeçalhos ───────────────────────────────────────────────────────

def chave_cabecalho(valor) -> str:
    t = normalizar(str(valor or '').replace('(*)', ''))
    return re.sub(r'[^a-z0-9]+', '_', t).strip('_')


def _por_heuristica(chave: str, colunas: tuple[Coluna, ...]) -> str | None:
    disponiveis = {c.chave for c in colunas}
    regras = (
        ('validade', ('valid', 'venc')),
        ('valor_unitario', ('valor', 'custo', 'preco')),
        ('saldo', ('saldo', 'estoque')),
        ('descricao', ('descr', 'nome', 'produto')),
        ('data', ('data', 'dt_')),
        ('tipo', ('oper', 'tipo')),
        ('quantidade', ('qtd', 'quant', 'qtde')),
        ('codigo', ('cod', 'cd_')),
        ('lote', ('lote',)),
        ('unidade', ('unid',)),
    )
    for destino, trechos in regras:
        if destino in disponiveis and any(chave.startswith(t) or t in chave for t in trechos):
            return destino
    return None


def mapear_cabecalho(linha: tuple, colunas: tuple[Coluna, ...]) -> dict[str, int]:
    """{chave da coluna: índice} para uma linha de cabeçalho."""
    exatos = {}
    for coluna in colunas:
        for apelido in (chave_cabecalho(coluna.titulo), *coluna.apelidos):
            exatos.setdefault(apelido, coluna.chave)

    mapa: dict[str, int] = {}
    pendentes = []
    for indice, valor in enumerate(linha):
        chave = chave_cabecalho(valor)
        if not chave:
            continue
        destino = exatos.get(chave)
        if destino and destino not in mapa:
            mapa[destino] = indice
        else:
            pendentes.append((indice, chave))

    for indice, chave in pendentes:
        destino = _por_heuristica(chave, colunas)
        if destino and destino not in mapa:
            mapa[destino] = indice
    return mapa


def _procurar_cabecalho(linhas: list[tuple], colunas, obrigatorias) -> tuple[int, dict[str, int]] | None:
    melhor = None
    for posicao, linha in enumerate(linhas[:LINHAS_PROCURA_CABECALHO]):
        mapa = mapear_cabecalho(linha, colunas)
        if obrigatorias <= set(mapa):
            return posicao, mapa
        acertos = len(obrigatorias & set(mapa))
        if acertos and (melhor is None or acertos > melhor[2]):
            melhor = (posicao, mapa, acertos)
    return None if melhor is None else (melhor[0], melhor[1])


def _titulos_faltando(mapa: dict[str, int], colunas: tuple[Coluna, ...]) -> list[str]:
    return [c.titulo for c in colunas if c.obrigatoria and c.chave not in mapa]


# ── Leitura ──────────────────────────────────────────────────────────

class LeitorPlanilhaEstoque:

    def __init__(self, arquivo, nome_arquivo: str = ''):
        self._arquivo = arquivo
        self._nome = (nome_arquivo or getattr(arquivo, 'name', '') or '').lower()
        self._alertas: list[Alerta] = []

    def ler(self) -> LeituraEstoque:
        tamanho = getattr(self._arquivo, 'size', None)
        if tamanho and tamanho > TAMANHO_MAXIMO_MB * 1024 * 1024:
            raise PlanilhaEstoqueInvalidaError(f'Arquivo muito grande. O limite é {TAMANHO_MAXIMO_MB} MB.')

        if self._nome.endswith('.csv'):
            abas = {'CSV': self._linhas_csv()}
        elif self._nome.endswith(('.xlsx', '.xlsm')) or not self._nome:
            abas = self._abas_xlsx()
        else:
            raise PlanilhaEstoqueInvalidaError('Formato não aceito. Envie a planilha em .xlsx (Excel) ou .csv.')

        aba_mov, (inicio_mov, mapa_mov) = self._escolher_aba(abas, COLUNAS_MOVIMENTACAO, OBRIGATORIAS_MOVIMENTACAO,
                                                             'de movimentações')
        movimentacoes, linhas_lidas = self._ler_movimentacoes(abas[aba_mov], inicio_mov, mapa_mov)

        saldos: list[SaldoLote] = []
        tem_saldo = False
        for nome, linhas in abas.items():
            if nome == aba_mov:
                continue
            achado = self._cabecalho_saldo(nome, linhas)
            if achado:
                saldos = self._ler_saldos(linhas, *achado)
                tem_saldo = True
                break

        if not movimentacoes:
            raise PlanilhaEstoqueInvalidaError(
                'Nenhuma movimentação válida foi encontrada. Confira se as datas, os tipos e as quantidades estão preenchidos.'
            )
        return LeituraEstoque(movimentacoes, saldos, self._alertas, aba_mov, tem_saldo, linhas_lidas)

    # ── Fontes ────────────────────────────────────────────────────────

    def _abas_xlsx(self) -> dict[str, list[tuple]]:
        try:
            if hasattr(self._arquivo, 'seek'):
                self._arquivo.seek(0)
            livro = load_workbook(self._arquivo, read_only=True, data_only=True)
        except Exception as erro:
            raise PlanilhaEstoqueInvalidaError(
                'Não foi possível abrir o arquivo. Confira se é uma planilha .xlsx válida e se não está protegida por senha.'
            ) from erro
        try:
            abas = {}
            total = 0
            for aba in livro.worksheets:
                linhas = []
                for linha in aba.iter_rows(values_only=True):
                    linhas.append(linha)
                    total += 1
                    if total > LIMITE_LINHAS:
                        raise PlanilhaEstoqueInvalidaError(
                            f'A planilha passa de {LIMITE_LINHAS:,} linhas. Envie um período menor (ex.: 6 meses).'.replace(',', '.')
                        )
                abas[aba.title] = linhas
            return abas
        finally:
            livro.close()

    def _linhas_csv(self) -> list[tuple]:
        if hasattr(self._arquivo, 'seek'):
            self._arquivo.seek(0)
        bruto = self._arquivo.read()
        for codificacao in ('utf-8-sig', 'cp1252', 'latin-1'):
            try:
                conteudo = bruto.decode(codificacao)
                break
            except UnicodeDecodeError:
                continue
        amostra = conteudo[:5000]
        try:
            dialeto = csv.Sniffer().sniff(amostra, delimiters=';,\t|')
        except csv.Error:
            delimitador = ';' if amostra.count(';') > amostra.count(',') else ','
            dialeto = type('DialetoPlanilha', (csv.excel,), {'delimiter': delimitador})
        linhas = [tuple(l) for l in csv.reader(io.StringIO(conteudo), dialeto)]
        if len(linhas) > LIMITE_LINHAS:
            raise PlanilhaEstoqueInvalidaError(f'O arquivo passa de {LIMITE_LINHAS} linhas. Envie um período menor.')
        return linhas

    def _escolher_aba(self, abas, colunas, obrigatorias, descricao):
        parcial = None
        for nome, linhas in abas.items():
            achado = _procurar_cabecalho(linhas, colunas, obrigatorias)
            if not achado:
                continue
            if obrigatorias <= set(achado[1]):
                return nome, achado
            if parcial is None or len(achado[1]) > len(parcial[1][1]):
                parcial = (nome, achado)

        if parcial:
            faltando = _titulos_faltando(parcial[1][1], colunas)
            raise PlanilhaEstoqueInvalidaError(
                f'A aba "{parcial[0]}" não tem as colunas obrigatórias: {", ".join(faltando)}. '
                'Baixe a planilha-modelo para ver os nomes aceitos.'
            )
        esperadas = ', '.join(c.titulo for c in colunas if c.obrigatoria)
        raise PlanilhaEstoqueInvalidaError(
            f'Não encontramos a tabela {descricao}. A planilha precisa ter as colunas: {esperadas}.'
        )

    def _cabecalho_saldo(self, nome_aba: str, linhas):
        achado = _procurar_cabecalho(linhas, COLUNAS_SALDO, OBRIGATORIAS_SALDO)
        if achado and OBRIGATORIAS_SALDO <= set(achado[1]):
            return achado
        # Aba chamada "Saldo"/"Posição" com a coluna "Quantidade" no lugar de "Saldo Atual"
        if any(p in normalizar(nome_aba) for p in ('saldo', 'posicao', 'inventario')):
            for posicao, linha in enumerate(linhas[:LINHAS_PROCURA_CABECALHO]):
                mapa = mapear_cabecalho(linha, COLUNAS_SALDO)
                if 'descricao' in mapa and 'saldo' not in mapa:
                    quantidade = next((i for i, v in enumerate(linha) if chave_cabecalho(v).startswith(('qtd', 'quant'))), None)
                    if quantidade is not None:
                        mapa['saldo'] = quantidade
                        return posicao, mapa
        return None

    # ── Linhas ────────────────────────────────────────────────────────

    def _ler_movimentacoes(self, linhas, inicio, mapa) -> tuple[list[Movimentacao], int]:
        problemas = {'data': [], 'quantidade': [], 'descricao': []}
        desconhecidos: Counter = Counter()
        sinal_negativo = 0
        zeradas = 0
        hoje = date.today()
        futuras = []
        resultado = []
        lidas = 0

        def campo(linha, chave):
            i = mapa.get(chave)
            return linha[i] if i is not None and i < len(linha) else None

        for numero, linha in enumerate(linhas[inicio + 1:], start=inicio + 2):
            if not linha or all(v is None or str(v).strip() == '' for v in linha):
                continue
            lidas += 1
            descricao = texto(campo(linha, 'descricao'))
            if not descricao:
                problemas['descricao'].append(numero)
                continue
            data_mov = converter_data(campo(linha, 'data'))
            if not data_mov:
                problemas['data'].append(numero)
                continue
            quantidade = converter_numero(campo(linha, 'quantidade'))
            if quantidade is None:
                problemas['quantidade'].append(numero)
                continue
            if quantidade == 0:
                zeradas += 1
                continue
            if data_mov > hoje:
                futuras.append(numero)
                continue

            tipo_texto = texto(campo(linha, 'tipo'))
            categoria = tipos.classificar(tipo_texto)
            if categoria == tipos.DESCONHECIDO:
                if quantidade < 0:  # sem tipo reconhecível, o sinal decide
                    categoria = tipos.SAIDA_OUTRA
                else:
                    desconhecidos[tipo_texto or '(vazio)'] += 1
                    continue
            if quantidade < 0:
                sinal_negativo += 1

            resultado.append(Movimentacao(
                linha=numero,
                codigo=texto(campo(linha, 'codigo')),
                descricao=descricao,
                data=data_mov,
                tipo=tipo_texto,
                categoria=categoria,
                quantidade=abs(quantidade),
                unidade=texto(campo(linha, 'unidade')),
                lote=texto(campo(linha, 'lote')),
                validade=converter_data(campo(linha, 'validade')),
            ))

        self._alertar_linhas(problemas, futuras, desconhecidos, sinal_negativo, zeradas)
        return resultado, lidas

    def _ler_saldos(self, linhas, inicio, mapa) -> list[SaldoLote]:
        invalidas = []
        resultado = []

        def campo(linha, chave):
            i = mapa.get(chave)
            return linha[i] if i is not None and i < len(linha) else None

        for numero, linha in enumerate(linhas[inicio + 1:], start=inicio + 2):
            if not linha or all(v is None or str(v).strip() == '' for v in linha):
                continue
            descricao = texto(campo(linha, 'descricao'))
            saldo = converter_numero(campo(linha, 'saldo'))
            if not descricao or saldo is None or saldo < 0:
                invalidas.append(numero)
                continue
            valor = converter_numero(campo(linha, 'valor_unitario'))
            resultado.append(SaldoLote(
                linha=numero,
                codigo=texto(campo(linha, 'codigo')),
                descricao=descricao,
                saldo=saldo,
                unidade=texto(campo(linha, 'unidade')),
                lote=texto(campo(linha, 'lote')),
                validade=converter_data(campo(linha, 'validade')),
                valor_unitario=valor if valor and valor > 0 else None,
            ))

        if invalidas:
            self._alertas.append(Alerta(
                'aviso', 'Linhas ignoradas na aba de saldo',
                f'{len(invalidas)} linha(s) da aba de saldo sem descrição ou com saldo inválido foram ignoradas.',
                [f'Linhas: {self._amostra(invalidas)}'],
            ))
        return resultado

    def _alertar_linhas(self, problemas, futuras, desconhecidos, sinal_negativo, zeradas):
        motivos = {
            'descricao': 'sem descrição do material',
            'data': 'com data inválida (use DD/MM/AAAA)',
            'quantidade': 'com quantidade inválida',
        }
        detalhes = [
            f'{len(linhas)} {motivos[chave]} — linhas {self._amostra(linhas)}'
            for chave, linhas in problemas.items() if linhas
        ]
        if futuras:
            detalhes.append(f'{len(futuras)} com data no futuro — linhas {self._amostra(futuras)}')
        if detalhes:
            total = sum(len(v) for v in problemas.values()) + len(futuras)
            self._alertas.append(Alerta(
                'aviso', 'Linhas ignoradas',
                f'{total} linha(s) de movimentação não puderam ser lidas e ficaram fora da análise.', detalhes,
            ))
        if desconhecidos:
            self._alertas.append(Alerta(
                'aviso', 'Tipos de movimentação não reconhecidos',
                f'{sum(desconhecidos.values())} movimentação(ões) com tipo não reconhecido foram ignoradas. '
                'Use os tipos da planilha-modelo ou inclua "Entrada" ou "Saída" no texto.',
                [f'"{t}" ({n}x)' for t, n in desconhecidos.most_common(EXEMPLOS_POR_ALERTA)],
            ))
        if sinal_negativo:
            self._alertas.append(Alerta(
                'info', 'Quantidades negativas',
                f'{sinal_negativo} movimentação(ões) tinham quantidade negativa. Consideramos o valor absoluto e '
                'o sentido (entrada/saída) indicado no tipo.',
            ))
        if zeradas:
            self._alertas.append(Alerta(
                'info', 'Movimentações zeradas', f'{zeradas} movimentação(ões) com quantidade zero foram ignoradas.',
            ))

    @staticmethod
    def _amostra(linhas: list[int]) -> str:
        amostra = ', '.join(str(n) for n in linhas[:EXEMPLOS_POR_ALERTA])
        return amostra + ('…' if len(linhas) > EXEMPLOS_POR_ALERTA else '')
