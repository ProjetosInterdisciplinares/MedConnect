"""
Planilhas da análise de estoque: modelo padronizado, exemplos e relatório.

Os exemplos são gerados na hora, com datas relativas ao dia de hoje, para
que as validades nunca fiquem no passado. O gerador usa semente fixa:
o mesmo dia gera sempre o mesmo arquivo.
"""
import io
import random
from dataclasses import dataclass
from datetime import date, timedelta

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from estoque_ia.analise import (
    DIAS_ESTOQUE_BAIXO, DIAS_PERIODO_RECOMENDADO, FATOR_SEGURANCA, HORIZONTE_PADRAO_DIAS, fmt_data,
)
from estoque_ia.leitor import COLUNAS_MOVIMENTACAO, COLUNAS_SALDO, Coluna
from estoque_ia.tipos import TIPOS_PADRAO

CONTENT_TYPE_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
ABA_MOVIMENTACOES = 'Movimentações'
ABA_SALDO = 'Saldo Atual'
ABA_TIPOS = 'Tipos de Movimentação'
AZUL = '1E3A5F'
FONTE = 'Calibri'
LINHAS_PRE_FORMATADAS = 300


@dataclass(frozen=True)
class ArquivoPlanilha:
    conteudo: bytes
    nome_arquivo: str
    content_type: str = CONTENT_TYPE_XLSX


# ── Estilo ───────────────────────────────────────────────────────────

_LINHA = Side(style='thin', color='CCCCCC')
BORDA = Border(left=_LINHA, right=_LINHA, top=_LINHA, bottom=_LINHA)


def _fill(cor: str) -> PatternFill:
    return PatternFill(start_color=cor, end_color=cor, fill_type='solid')


def _cabecalho(aba, titulos: list[tuple[str, int]], obrigatorias: set[str] = frozenset()) -> None:
    for indice, (titulo, largura) in enumerate(titulos, start=1):
        celula = aba.cell(row=1, column=indice, value=titulo)
        celula.font = Font(name=FONTE, bold=True, size=11, color='FFFFFF')
        celula.fill = _fill('9B1C1C' if titulo in obrigatorias else AZUL)
        celula.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        celula.border = BORDA
        aba.column_dimensions[get_column_letter(indice)].width = largura
    aba.row_dimensions[1].height = 32
    aba.freeze_panes = 'A2'


def _titulo_coluna(coluna: Coluna) -> str:
    return f'{coluna.titulo} (*)' if coluna.obrigatoria else coluna.titulo


def _formatar_colunas(aba, colunas: tuple[Coluna, ...], linhas: int) -> None:
    for indice, coluna in enumerate(colunas, start=1):
        letra = get_column_letter(indice)
        for linha in range(2, linhas + 2):
            celula = aba[f'{letra}{linha}']
            celula.border = BORDA
            if coluna.chave in ('data', 'validade'):
                celula.number_format = 'DD/MM/YYYY'
            elif coluna.chave in ('quantidade', 'saldo'):
                celula.number_format = '#,##0.##'
            elif coluna.chave == 'valor_unitario':
                celula.number_format = '#,##0.00'
            else:
                celula.number_format = '@'


def _salvar(livro: Workbook, nome: str) -> ArquivoPlanilha:
    buffer = io.BytesIO()
    livro.save(buffer)
    return ArquivoPlanilha(buffer.getvalue(), nome)


# ── Modelo padronizado ───────────────────────────────────────────────

def gerar_modelo() -> ArquivoPlanilha:
    livro = Workbook()
    tutorial = livro.active
    tutorial.title = 'Tutorial'
    _escrever_tutorial(tutorial)

    mov = livro.create_sheet(ABA_MOVIMENTACOES)
    _cabecalho(mov, [(_titulo_coluna(c), c.largura) for c in COLUNAS_MOVIMENTACAO],
               {_titulo_coluna(c) for c in COLUNAS_MOVIMENTACAO if c.obrigatoria})
    _formatar_colunas(mov, COLUNAS_MOVIMENTACAO, LINHAS_PRE_FORMATADAS)

    saldo = livro.create_sheet(ABA_SALDO)
    _cabecalho(saldo, [(_titulo_coluna(c), c.largura) for c in COLUNAS_SALDO],
               {_titulo_coluna(c) for c in COLUNAS_SALDO if c.obrigatoria})
    _formatar_colunas(saldo, COLUNAS_SALDO, LINHAS_PRE_FORMATADAS)

    tipos_aba = livro.create_sheet(ABA_TIPOS)
    _cabecalho(tipos_aba, [('Tipo de Movimentação', 42), ('Quando usar', 90)])
    for linha, (texto, _, explicacao) in enumerate(TIPOS_PADRAO, start=2):
        tipos_aba.cell(row=linha, column=1, value=texto).border = BORDA
        celula = tipos_aba.cell(row=linha, column=2, value=explicacao)
        celula.border = BORDA
        celula.alignment = Alignment(wrap_text=True)

    # Lista suspensa no tipo; texto livre continua aceito (exportação de ERP)
    coluna_tipo = get_column_letter(next(i for i, c in enumerate(COLUNAS_MOVIMENTACAO, 1) if c.chave == 'tipo'))
    validacao = DataValidation(
        type='list', formula1=f"'{ABA_TIPOS}'!$A$2:$A${len(TIPOS_PADRAO) + 1}",
        allow_blank=True, showErrorMessage=False,
    )
    validacao.add(f'{coluna_tipo}2:{coluna_tipo}{LINHAS_PRE_FORMATADAS + 1}')
    mov.add_data_validation(validacao)

    livro.active = 1
    return _salvar(livro, 'modelo_analise_estoque.xlsx')


def _escrever_tutorial(aba) -> None:
    aba.column_dimensions['A'].width = 32
    aba.column_dimensions['B'].width = 95
    linha = 1

    def escrever(a, b='', negrito=False, cor=None, tamanho=11):
        nonlocal linha
        ca = aba.cell(row=linha, column=1, value=a)
        cb = aba.cell(row=linha, column=2, value=b)
        ca.font = Font(name=FONTE, bold=True if b else negrito, size=tamanho, color=cor)
        cb.font = Font(name=FONTE, size=11)
        cb.alignment = Alignment(wrap_text=True, vertical='top')
        ca.alignment = Alignment(vertical='top', wrap_text=True)
        linha += 1

    aba.merge_cells('A1:B1')
    titulo = aba.cell(row=1, column=1, value='Análise de Estoque com IA — MedConnect')
    titulo.font = Font(name=FONTE, bold=True, size=14, color='FFFFFF')
    titulo.fill = _fill(AZUL)
    titulo.alignment = Alignment(horizontal='center', vertical='center')
    aba.row_dimensions[1].height = 40
    linha = 3

    escrever('COMO USAR', negrito=True, cor=AZUL, tamanho=12)
    for passo, texto_passo in (
        ('Passo 1', f"Na aba '{ABA_MOVIMENTACOES}', lance uma linha por movimentação (entrada ou saída) do período."),
        ('Passo 2', f"Opcional, mas recomendado: na aba '{ABA_SALDO}', informe o saldo de hoje por lote, com a validade."),
        ('Passo 3', 'Salve o arquivo e envie em Anúncios → Analisar estoque com IA.'),
        ('Passo 4', 'A IA mostra o que deve sobrar e sugere quanto anunciar de cada item. A análise fica salva no histórico.'),
    ):
        escrever(passo, texto_passo)

    linha += 1
    escrever(f"ABA '{ABA_MOVIMENTACOES}'", negrito=True, cor=AZUL, tamanho=12)
    for coluna in COLUNAS_MOVIMENTACAO:
        escrever(_titulo_coluna(coluna), coluna.explicacao)

    linha += 1
    escrever(f"ABA '{ABA_SALDO}' (opcional)", negrito=True, cor=AZUL, tamanho=12)
    for coluna in COLUNAS_SALDO:
        escrever(_titulo_coluna(coluna), coluna.explicacao)

    linha += 1
    escrever('TIPOS DE MOVIMENTAÇÃO', negrito=True, cor=AZUL, tamanho=12)
    for texto_tipo, _, explicacao in TIPOS_PADRAO:
        escrever(texto_tipo, explicacao)

    linha += 1
    escrever('REGRAS IMPORTANTES', negrito=True, cor=AZUL, tamanho=12)
    for regra, explicacao in (
        ('Período', f'Envie pelo menos {DIAS_PERIODO_RECOMENDADO} dias de movimentação; o ideal são 3 a 6 meses. '
                    'Períodos curtos geram um alerta, pois itens de uso mensal podem parecer parados.'),
        ('Exportação do ERP', 'Pode enviar a exportação do seu sistema sem reescrever: colunas como CD_MATERIAL, '
                              'DS_MATERIAL, DT_MOVIMENTO_ESTOQUE, OPERA_ESTO e QTD_MOVIMENTO são reconhecidas.'),
        ('Formatos', 'Arquivo .xlsx ou .csv, até 30 MB. Datas em DD/MM/AAAA; quantidades com vírgula ou ponto.'),
        ('Transferências internas', 'Trocas entre almoxarifado e farmácia satélite não contam como consumo: use '
                                    '"Transferência interna (entre estoques)".'),
        ('Margem de segurança', f'A sugestão mantém o consumo previsto dos próximos {HORIZONTE_PADRAO_DIAS} dias '
                                f'(ajustável para 90 ou 365) com {round((FATOR_SEGURANCA - 1) * 100)}% de margem.'),
        ('Estoque baixo', f'Itens com estoque para menos de {DIAS_ESTOQUE_BAIXO} dias geram alerta e nunca são sugeridos.'),
        ('Lotes vencidos', 'Lotes já vencidos aparecem em alerta e não podem ser anunciados.'),
    ):
        escrever(regra, explicacao)


# ── Exemplos ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class _Perfil:
    codigo: int
    descricao: str
    unidade: str
    valor: float
    tipo: str              # saudavel | baixo | sem_giro | raro | vencimento | excesso
    consumo_dia: float = 0
    estoque_inicial: int = 0
    compra: int = 0
    validade_dias: int = 365
    eventos: int = 0


CATALOGO_EXEMPLO = (
    _Perfil(1001, 'Seringa Descartável 10ml Luer Lock', 'Unidade', 0.62, 'saudavel', 40, 1500, 1200, 700),
    _Perfil(1002, 'Agulha Descartável 40x12', 'Unidade', 0.18, 'saudavel', 55, 2200, 1700, 900),
    _Perfil(1003, 'Luva de Procedimento Tam. M', 'Caixa', 24.90, 'saudavel', 6, 220, 180, 600),
    _Perfil(1004, 'Dipirona Sódica 500mg/ml Ampola 2ml', 'Ampola', 0.95, 'saudavel', 30, 1100, 900, 500),
    _Perfil(1005, 'Soro Fisiológico 0,9% 500ml', 'Bolsa', 4.30, 'saudavel', 25, 900, 750, 540),
    _Perfil(1006, 'Equipo Macrogotas com Injetor Lateral', 'Unidade', 2.10, 'baixo', 18, 200, 486, 700),
    _Perfil(1007, 'Cateter Intravenoso nº 22', 'Unidade', 1.85, 'baixo', 14, 150, 378, 800),
    _Perfil(1008, 'Ceftriaxona 1g Frasco-ampola', 'Frasco-ampola', 6.40, 'baixo', 9, 100, 243, 420),
    _Perfil(1009, 'Torneirinha 3 Vias Luer Lock', 'Unidade', 1.40, 'sem_giro', 0, 0, 120, 380),
    _Perfil(1010, 'Agulha Veress 120mm', 'Unidade', 89.00, 'sem_giro', 0, 0, 12, 500),
    _Perfil(1011, 'Sonda de Aspiração Traqueal nº 14', 'Unidade', 1.10, 'sem_giro', 0, 0, 200, 150),
    _Perfil(1012, 'Fio Vicryl 2-0', 'Unidade', 18.50, 'sem_giro', 0, 0, 48, 260),
    _Perfil(1013, 'Garamicina 80mg Ampola 2ml', 'Ampola', 2.30, 'raro', 0, 0, 130, 300, 3),
    _Perfil(1014, 'Bolsa para Colostomia 30mm', 'Unidade', 12.90, 'raro', 0, 0, 100, 540, 2),
    _Perfil(1015, 'Fio Mononylon 3-0', 'Unidade', 4.20, 'raro', 0, 0, 80, 420, 3),
    _Perfil(1016, 'Adrenalina 1mg/ml Ampola 1ml', 'Ampola', 3.10, 'raro', 0, 0, 60, 330, 1),
    _Perfil(1017, 'Seringa Descartável 3ml Luer Lock', 'Unidade', 0.35, 'vencimento', 1.5, 0, 900, 50),
    _Perfil(1018, 'Clorexidina Degermante 2% 1000ml', 'Frasco', 21.00, 'vencimento', 0.5, 0, 120, 70),
    _Perfil(1019, 'Cloreto de Potássio 19,1% Ampola 10ml', 'Ampola', 1.20, 'vencimento', 0.3, 0, 80, 40),
    _Perfil(1020, 'Sonda Foley 2 Vias nº 12', 'Unidade', 5.80, 'vencimento', 0.2, 0, 60, 95),
    _Perfil(1021, 'Gaze Estéril 7,5x7,5cm Pacote', 'Pacote', 0.95, 'excesso', 10, 600, 5200, 900),
    _Perfil(1022, 'Esparadrapo 10cm x 4,5m', 'Rolo', 6.70, 'excesso', 2, 80, 900, 1000),
    _Perfil(1023, 'Omeprazol 40mg Frasco-ampola', 'Frasco-ampola', 9.80, 'excesso', 3, 120, 1400, 640),
)

OPERACOES_ERP = {
    'consumo': ('Saída - Dispensação por Prescrição', 'Saída - Consumo do Setor'),
    'compra': 'Entrada - Compra (Nota Fiscal)',
    'perda': 'Saída - Perda por Vencimento',
    'transf_saida': 'Saída - Transferência entre Estoques',
    'transf_entrada': 'Entrada - Transferência entre Estoques',
    'ajuste': 'Entrada - Ajuste de Inventário',
}
OPERACOES_PADRAO = {
    'consumo': ('Saída - Consumo / Dispensação',),
    'compra': 'Entrada - Compra',
    'perda': 'Saída - Perda por vencimento',
    'transf_saida': 'Transferência interna (entre estoques)',
    'transf_entrada': 'Transferência interna (entre estoques)',
}


def _simular(perfil: _Perfil, dias: int, inicio: date, hoje: date, rng: random.Random, operacoes: dict):
    """Movimentações de um material e os lotes que sobram no fim (qtd, lote, validade)."""
    movs = []
    lotes = []  # [qtd, lote, validade, entrada]
    saldo = perfil.estoque_inicial
    if saldo:
        lotes.append([saldo, f'L{perfil.codigo}A', hoje + timedelta(days=perfil.validade_dias // 2), inicio])
        if 'ajuste' in operacoes:  # exportação de ERP: o saldo inicial vem de um ajuste de inventário
            movs.append((inicio, operacoes['ajuste'], saldo, '', None))

    def comprar(dia: date, qtd: int, validade: date):
        lote = f'L{perfil.codigo}{len(lotes) + 1:02d}'
        lotes.append([qtd, lote, validade, dia])
        movs.append((dia, operacoes['compra'], qtd, lote, validade))

    def consumir(dia: date, qtd: float):
        restante = qtd
        for lote in sorted(lotes, key=lambda l: l[2]):  # FEFO
            usado = min(lote[0], restante)
            lote[0] -= usado
            restante -= usado
        total = qtd - restante
        if total > 0:
            movs.append((dia, rng.choice(operacoes['consumo']), round(total), '', None))

    if perfil.tipo in ('sem_giro', 'raro', 'vencimento'):
        validade = hoje + timedelta(days=perfil.validade_dias)
        comprar(min(inicio + timedelta(days=rng.randint(3, 12)), hoje - timedelta(days=1)), perfil.compra, validade)
    if perfil.tipo == 'vencimento':  # lote antigo que já venceu no período e foi baixado
        perdido = max(5, perfil.compra // 5)
        movs.append((inicio + timedelta(days=dias // 2), operacoes['perda'], perdido, '', None))

    janela = range(min(20, dias // 3), max(dias - 5, 1))
    dias_raros = sorted(rng.sample(janela, min(perfil.eventos, len(janela)))) if perfil.tipo == 'raro' else []
    for n in range(dias):
        dia = inicio + timedelta(days=n)
        estoque = sum(l[0] for l in lotes)
        if perfil.tipo in ('saudavel', 'baixo', 'excesso'):
            if perfil.tipo != 'baixo' and n % 30 == 5 and (perfil.tipo == 'excesso' and n < 10 or estoque < perfil.consumo_dia * 40):
                comprar(dia, perfil.compra, hoje + timedelta(days=perfil.validade_dias + rng.randint(-30, 30)))
            if perfil.tipo == 'baixo' and n % 30 == 5:  # compra um pouco abaixo do consumo do mês
                comprar(dia, perfil.compra, hoje + timedelta(days=perfil.validade_dias))
            if rng.random() < 0.9:
                consumir(dia, max(1, round(rng.gauss(perfil.consumo_dia, perfil.consumo_dia * 0.25))))
        elif perfil.tipo == 'vencimento':
            if rng.random() < perfil.consumo_dia / 3:
                consumir(dia, rng.randint(1, 5))
        elif n in dias_raros:
            consumir(dia, rng.randint(2, 6))

        if n % 7 == 3 and perfil.tipo in ('saudavel', 'baixo') and estoque > 50:
            qtd = rng.randint(10, 40)  # reposição da farmácia satélite (não altera o total)
            movs.append((dia, operacoes['transf_saida'], qtd, '', None))
            movs.append((dia, operacoes['transf_entrada'], qtd, '', None))

    return movs, [(round(q), lote, validade) for q, lote, validade, _ in lotes if round(q) > 0]


def gerar_exemplo(tipo: str, hoje: date | None = None) -> ArquivoPlanilha:
    """
    'completo': movimentações de 120 dias + saldo atual com lote, validade e valor.
    'erp': exportação crua de ERP (colunas e textos do sistema), 90 dias, sem saldo.
    'alertas': período curto e linhas com problemas, para ver os alertas da tela.
    """
    hoje = hoje or date.today()
    rng = random.Random(hoje.toordinal())
    if tipo == 'erp':
        return _exemplo_erp(hoje, rng)
    if tipo == 'alertas':
        return _exemplo_alertas(hoje, rng)
    return _exemplo_completo(hoje, rng)


def _exemplo_completo(hoje: date, rng: random.Random) -> ArquivoPlanilha:
    dias = 120
    inicio = hoje - timedelta(days=dias)
    livro = Workbook()
    mov = livro.active
    mov.title = ABA_MOVIMENTACOES
    _cabecalho(mov, [(_titulo_coluna(c), c.largura) for c in COLUNAS_MOVIMENTACAO],
               {_titulo_coluna(c) for c in COLUNAS_MOVIMENTACAO if c.obrigatoria})
    saldo = livro.create_sheet(ABA_SALDO)
    _cabecalho(saldo, [(_titulo_coluna(c), c.largura) for c in COLUNAS_SALDO],
               {_titulo_coluna(c) for c in COLUNAS_SALDO if c.obrigatoria})

    linhas_mov, linhas_saldo = [], []
    for perfil in CATALOGO_EXEMPLO:
        movs, lotes = _simular(perfil, dias, inicio, hoje, rng, OPERACOES_PADRAO)
        for dia, operacao, qtd, lote, validade in movs:
            linhas_mov.append((str(perfil.codigo), perfil.descricao, dia, operacao, qtd, perfil.unidade, lote, validade))
        for qtd, lote, validade in lotes:
            linhas_saldo.append((str(perfil.codigo), perfil.descricao, qtd, perfil.unidade, lote, validade, perfil.valor))
    # Um lote vencido esquecido na prateleira, para mostrar o alerta
    linhas_saldo.append(('1004', 'Dipirona Sódica 500mg/ml Ampola 2ml', 40, 'Ampola', 'L1004V', hoje - timedelta(days=12), 0.95))

    linhas_mov.sort(key=lambda l: (l[2], l[0]))
    _escrever_linhas(mov, linhas_mov, datas=(3, 8))
    _escrever_linhas(saldo, linhas_saldo, datas=(6,))
    return _salvar(livro, 'exemplo_estoque_completo.xlsx')


def _exemplo_erp(hoje: date, rng: random.Random) -> ArquivoPlanilha:
    dias = 90
    inicio = hoje - timedelta(days=dias)
    livro = Workbook()
    aba = livro.active
    aba.title = 'Exportar Planilha'
    titulos = ['CD_MATERIAL', 'DS_MATERIAL', 'DT_MOVIMENTO_ESTOQUE', 'OPERA_ESTO', 'QTD_MOVIMENTO']
    for i, t in enumerate(titulos, start=1):
        aba.cell(row=1, column=i, value=t).font = Font(bold=True)
        aba.column_dimensions[get_column_letter(i)].width = (14, 50, 22, 42, 16)[i - 1]
    linhas = []
    for perfil in CATALOGO_EXEMPLO:
        movs, _ = _simular(perfil, dias, inicio, hoje, rng, OPERACOES_ERP)
        linhas += [(perfil.codigo, perfil.descricao, dia, op, qtd) for dia, op, qtd, *_ in movs]
    linhas.sort(key=lambda l: (l[2], l[0]))
    for n, (codigo, descricao, dia, op, qtd) in enumerate(linhas, start=2):
        # ERP costuma exportar a data como texto DD/MM/AA
        for i, valor in enumerate((codigo, descricao, dia.strftime('%d/%m/%y'), op, qtd), start=1):
            aba.cell(row=n, column=i, value=valor)
    return _salvar(livro, 'exemplo_exportacao_erp.xlsx')


def _exemplo_alertas(hoje: date, rng: random.Random) -> ArquivoPlanilha:
    dias = 10
    inicio = hoje - timedelta(days=dias)
    livro = Workbook()
    mov = livro.active
    mov.title = ABA_MOVIMENTACOES
    _cabecalho(mov, [(_titulo_coluna(c), c.largura) for c in COLUNAS_MOVIMENTACAO])
    linhas, linhas_saldo = [], []
    for perfil in CATALOGO_EXEMPLO[:10]:
        movs, lotes = _simular(perfil, dias, inicio, hoje, rng, OPERACOES_PADRAO)
        linhas += [(str(perfil.codigo), perfil.descricao, dia, op, qtd, perfil.unidade, lote, val)
                   for dia, op, qtd, lote, val in movs]
        linhas_saldo += [(str(perfil.codigo), perfil.descricao, q, perfil.unidade, lote, val, perfil.valor)
                         for q, lote, val in lotes]
    linhas.sort(key=lambda l: (l[2], l[0]))
    linhas += [
        ('1001', 'Seringa Descartável 10ml Luer Lock', '31/02/2026', 'Saída - Consumo / Dispensação', 10, 'Unidade', '', None),
        ('1002', 'Agulha Descartável 40x12', hoje - timedelta(days=2), 'Empréstimo informal', 15, 'Unidade', '', None),
        ('', '', hoje - timedelta(days=1), 'Saída - Consumo / Dispensação', 5, '', '', None),
        ('1003', 'Luva de Procedimento Tam. M', hoje - timedelta(days=1), 'Saída - Consumo / Dispensação', 'dez', 'Caixa', '', None),
    ]
    _escrever_linhas(mov, linhas, datas=(3, 8))
    saldo = livro.create_sheet(ABA_SALDO)
    _cabecalho(saldo, [(_titulo_coluna(c), c.largura) for c in COLUNAS_SALDO])
    linhas_saldo.append(('1004', 'Dipirona Sódica 500mg/ml Ampola 2ml', 30, 'Ampola', 'L1004V', hoje - timedelta(days=5), 0.95))
    _escrever_linhas(saldo, linhas_saldo, datas=(6,))
    return _salvar(livro, 'exemplo_com_alertas.xlsx')


def _escrever_linhas(aba, linhas, datas=()) -> None:
    for n, linha in enumerate(linhas, start=2):
        for i, valor in enumerate(linha, start=1):
            celula = aba.cell(row=n, column=i, value=valor)
            if i in datas and isinstance(valor, date):
                celula.number_format = 'DD/MM/YYYY'


# ── Relatório de uma análise salva ───────────────────────────────────

def gerar_relatorio(analise) -> ArquivoPlanilha:
    livro = Workbook()
    resumo = livro.active
    resumo.title = 'Resumo'
    resumo.column_dimensions['A'].width = 34
    resumo.column_dimensions['B'].width = 100
    ind = analise.indicadores or {}
    linhas = [
        ('Arquivo', analise.nome_arquivo),
        ('Data da análise', analise.criado_em.strftime('%d/%m/%Y %H:%M')),
        ('Período das movimentações', f'{fmt_data(analise.periodo_inicio)} a {fmt_data(analise.periodo_fim)} '
                                      f'({analise.dias_periodo} dias)'),
        ('Horizonte de planejamento', f'{analise.horizonte_dias} dias'),
        ('Movimentações analisadas', analise.total_movimentacoes),
        ('Materiais analisados', analise.total_materiais),
        ('Itens sugeridos para anúncio', analise.total_sugeridos),
        ('Valor parado — custo (R$)', ind.get('valor_total_sugerido') or '—'),
        ('Como o valor é calculado', 'Quantidade sugerida × valor unitário informado na aba Saldo Atual (custo, não preço de venda).'),
        ('Análise com IA', 'Sim' if analise.ia_utilizada else 'Não (análise estatística)'),
        ('Resumo da IA', analise.resumo_ia or '—'),
    ]
    linhas += [(f'Recomendação {n}', r) for n, r in enumerate(analise.recomendacoes or [], start=1)]
    linhas += [(f'Alerta: {a["titulo"]}', a['mensagem']) for a in (analise.alertas or [])]
    for n, (rotulo, valor) in enumerate(linhas, start=1):
        resumo.cell(row=n, column=1, value=rotulo).font = Font(name=FONTE, bold=True)
        celula = resumo.cell(row=n, column=2, value=valor)
        celula.alignment = Alignment(wrap_text=True, vertical='top')

    colunas = [
        ('Código', 14, 'codigo'), ('Material', 48, 'descricao'), ('Unidade', 14, 'unidade'),
        ('Situação', 20, 'perfil_rotulo'), ('Prioridade', 12, 'prioridade'), ('Saldo', 12, 'saldo'),
        ('Saldo estimado?', 14, 'saldo_estimado'), ('Consumo no período', 18, 'consumo'),
        ('Consumo médio/mês', 18, 'consumo_mensal'), ('Saídas p/ consumo', 16, 'eventos_consumo'),
        ('Cobertura (dias)', 16, 'cobertura_dias'), ('Dias sem consumo', 16, 'dias_sem_consumo'),
        ('Perda por vencimento', 18, 'perda_vencimento'), ('Validade mais próxima', 20, 'validade_proxima'),
        ('Sobra prevista no vencimento', 24, 'qtd_risco_vencimento'), ('Qtd. vencida', 14, 'qtd_vencida'),
        ('Qtd. sugerida p/ anunciar', 22, 'qtd_sugerida'), ('Valor unitário da planilha (R$)', 24, 'valor_unitario'),
        ('Valor parado — custo (R$)', 22, 'valor_excedente'), ('Justificativa', 80, 'justificativa'),
    ]
    itens = analise.itens or []
    for titulo_aba, filtro in (('Sugestões para anunciar', lambda i: i['anunciar']), ('Estoque analisado', None)):
        aba = livro.create_sheet(titulo_aba)
        _cabecalho(aba, [(t, l) for t, l, _ in colunas])
        selecionados = [i for i in itens if filtro is None or filtro(i)]
        for n, item in enumerate(selecionados, start=2):
            for c, (_, _, chave) in enumerate(colunas, start=1):
                valor = item.get(chave)
                if isinstance(valor, bool):
                    valor = 'Sim' if valor else 'Não'
                elif chave in ('validade_proxima',) and valor:
                    valor = fmt_data(date.fromisoformat(valor))
                elif chave == 'prioridade':
                    valor = {'alta': 'Alta', 'media': 'Média', 'baixa': 'Baixa'}.get(valor, '—')
                aba.cell(row=n, column=c, value=valor)
        aba.auto_filter.ref = f'A1:{get_column_letter(len(colunas))}{max(2, len(selecionados) + 1)}'

    nome = f'analise_estoque_{analise.criado_em:%Y%m%d_%H%M}.xlsx'
    return _salvar(livro, nome)
