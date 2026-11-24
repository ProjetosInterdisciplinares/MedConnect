"""
Tipos de movimentação de estoque.

A planilha-modelo traz uma lista padronizada (TIPOS_PADRAO), mas o
classificador também entende o texto livre exportado pelos sistemas de
gestão hospitalar (ex.: "Saída - Dispensação por Prescrição"), para que
o hospital possa enviar a exportação do ERP sem precisar reescrevê-la.
"""
import re
import unicodedata
from functools import lru_cache

ENTRADA_COMPRA = 'entrada_compra'
ENTRADA_TRANSFERENCIA = 'entrada_transferencia'
ENTRADA_DEVOLUCAO = 'entrada_devolucao'
ENTRADA_AJUSTE = 'entrada_ajuste'
ENTRADA_PRODUCAO = 'entrada_producao'
ENTRADA_OUTRA = 'entrada_outra'
SAIDA_CONSUMO = 'saida_consumo'
SAIDA_TRANSFERENCIA = 'saida_transferencia'
SAIDA_PERDA_VENCIMENTO = 'saida_perda_vencimento'
SAIDA_PERDA_OUTRA = 'saida_perda_outra'
SAIDA_AJUSTE = 'saida_ajuste'
SAIDA_OUTRA = 'saida_outra'
TRANSFERENCIA_INTERNA = 'transferencia_interna'
DESCONHECIDO = 'desconhecido'

ENTRADAS = frozenset({
    ENTRADA_COMPRA, ENTRADA_TRANSFERENCIA, ENTRADA_DEVOLUCAO, ENTRADA_AJUSTE, ENTRADA_PRODUCAO, ENTRADA_OUTRA,
})
SAIDAS = frozenset({
    SAIDA_CONSUMO, SAIDA_TRANSFERENCIA, SAIDA_PERDA_VENCIMENTO, SAIDA_PERDA_OUTRA, SAIDA_AJUSTE, SAIDA_OUTRA,
})

# (texto na planilha, categoria, explicação) — usado na lista suspensa e no tutorial da planilha-modelo
TIPOS_PADRAO = (
    ('Entrada - Compra', ENTRADA_COMPRA, 'Recebimento de compra (nota fiscal).'),
    ('Entrada - Transferência de outra unidade', ENTRADA_TRANSFERENCIA, 'Material recebido de outra unidade/filial.'),
    ('Entrada - Devolução', ENTRADA_DEVOLUCAO, 'Material devolvido por setor ou paciente (abate do consumo).'),
    ('Entrada - Produção / Manipulação', ENTRADA_PRODUCAO, 'Item produzido ou fracionado na farmácia.'),
    ('Entrada - Ajuste de inventário', ENTRADA_AJUSTE, 'Correção positiva após contagem do estoque.'),
    ('Saída - Consumo / Dispensação', SAIDA_CONSUMO, 'Uso real: dispensação por prescrição, consumo do setor etc.'),
    ('Saída - Transferência para outra unidade', SAIDA_TRANSFERENCIA, 'Material enviado para outra unidade/filial.'),
    ('Saída - Perda por vencimento', SAIDA_PERDA_VENCIMENTO, 'Baixa de material vencido (desperdício).'),
    ('Saída - Perda por quebra / avaria', SAIDA_PERDA_OUTRA, 'Quebra, contaminação, avaria ou extravio.'),
    ('Saída - Ajuste de inventário', SAIDA_AJUSTE, 'Correção negativa após contagem do estoque.'),
    ('Transferência interna (entre estoques)', TRANSFERENCIA_INTERNA, 'Troca entre almoxarifado e farmácia satélite: não altera o estoque total e é ignorada.'),
)

ROTULOS = {
    ENTRADA_COMPRA: 'Entrada - Compra',
    ENTRADA_TRANSFERENCIA: 'Entrada - Transferência',
    ENTRADA_DEVOLUCAO: 'Entrada - Devolução',
    ENTRADA_AJUSTE: 'Entrada - Ajuste de inventário',
    ENTRADA_PRODUCAO: 'Entrada - Produção',
    ENTRADA_OUTRA: 'Entrada (outros)',
    SAIDA_CONSUMO: 'Saída - Consumo',
    SAIDA_TRANSFERENCIA: 'Saída - Transferência',
    SAIDA_PERDA_VENCIMENTO: 'Saída - Perda por vencimento',
    SAIDA_PERDA_OUTRA: 'Saída - Perda (quebra/avaria)',
    SAIDA_AJUSTE: 'Saída - Ajuste de inventário',
    SAIDA_OUTRA: 'Saída (outros)',
    TRANSFERENCIA_INTERNA: 'Transferência interna',
    DESCONHECIDO: 'Não reconhecido',
}


def normalizar(texto) -> str:
    """Minúsculas, sem acentos e com espaços simples."""
    sem_acento = unicodedata.normalize('NFKD', str(texto or '')).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'\s+', ' ', sem_acento.lower()).strip()


def _tem(texto: str, *trechos: str) -> bool:
    return any(t in texto for t in trechos)


@lru_cache(maxsize=2048)
def classificar(texto: str) -> str:
    """Categoria de um tipo de movimentação escrito na planilha."""
    t = normalizar(texto)
    if not t:
        return DESCONHECIDO

    if 'transf' in t and _tem(t, 'entre estoque', 'interna', 'entre almox', 'entre deposito', 'entre local', 'entre farmacia'):
        return TRANSFERENCIA_INTERNA

    entrada = bool(re.search(r'\bentrada\b|^e\s*[-:]|\brecebimento\b', t))
    saida = bool(re.search(r'\bsaida\b|^s\s*[-:]', t))
    if entrada == saida:  # nenhum ou os dois: decide pelas palavras-chave
        if _tem(t, 'compra', 'nota fiscal', 'aquisicao', 'recebimento'):
            entrada, saida = True, False
        elif _tem(t, 'consumo', 'dispensa', 'perda', 'vencid', 'quebra', 'avaria', 'descarte', 'requisicao', 'baixa'):
            entrada, saida = False, True
        else:
            return DESCONHECIDO

    if entrada:
        if _tem(t, 'compra', 'nota fiscal', 'aquisicao', 'recebimento', 'fornecedor'):
            return ENTRADA_COMPRA
        if 'devolu' in t:
            return ENTRADA_DEVOLUCAO
        if _tem(t, 'ajuste', 'invent'):
            return ENTRADA_AJUSTE
        if _tem(t, 'produ', 'manipula', 'fraciona'):
            return ENTRADA_PRODUCAO
        if _tem(t, 'transf', 'emprest', 'doacao'):
            return ENTRADA_TRANSFERENCIA
        return ENTRADA_OUTRA

    if _tem(t, 'venc', 'validade', 'expira'):
        return SAIDA_PERDA_VENCIMENTO
    if _tem(t, 'perda', 'quebra', 'avaria', 'contamina', 'descarte', 'extravio', 'furto', 'roubo', 'deteriora'):
        return SAIDA_PERDA_OUTRA
    if _tem(t, 'ajuste', 'invent'):
        return SAIDA_AJUSTE
    if _tem(t, 'transf', 'emprest', 'doacao', 'devolu'):
        return SAIDA_TRANSFERENCIA
    if _tem(t, 'consumo', 'dispensa', 'prescri', 'uso', 'aplica', 'requisi', 'atendimento', 'paciente', 'setor'):
        return SAIDA_CONSUMO
    return SAIDA_OUTRA
