"""
Sugestão de código CATMAT a partir do nome digitado pelo usuário.

A busca é feita na cópia local do catálogo (ItemCatmat). O texto do
usuário e as descrições passam pela mesma normalização, para que
"seringa 20ml", "Seringa 20 ML" e "SERINGA, 20 ML" se encontrem.
"""
import re
import unicodedata

from django.db.models import Case, IntegerField, Q, Value, When
from django.db.models.functions import Length

from preco_referencia.models import ItemCatmat

# Classes do grupo 65 (saúde) carregadas no catálogo local
CLASSES_PADRAO = (6505, 6510, 6515, 6532)

# Categoria do insumo no MedConnect → classes do catálogo em que buscar
CLASSES_POR_CATEGORIA = {
    'Medicamento': (6505,),
    'Material Hospitalar': (6510, 6515, 6532),
}

LIMITE_SUGESTOES = 8
PALAVRAS_IGNORADAS = {'DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'C', 'P', 'PARA', 'COM'}


def normalizar(texto: str) -> str:
    """
    Maiúsculas, sem acentos, número separado da unidade ("20ML" → "20 ML")
    e vírgula decimal como ponto ("0,9" → "0.9"). Começa e termina com
    espaço, para comparar palavras inteiras.
    """
    texto = ''.join(
        c for c in unicodedata.normalize('NFD', texto or '') if unicodedata.category(c) != 'Mn'
    ).upper()
    texto = re.sub(r'(\d),(\d)', r'\1.\2', texto)
    texto = re.sub(r'(\d)([A-Z])', r'\1 \2', texto)
    texto = re.sub(r'([A-Z])(\d)', r'\1 \2', texto)
    texto = re.sub(r'[^A-Z0-9.]+', ' ', texto)
    texto = re.sub(r'(?<!\d)\.|\.(?!\d)', ' ', texto)  # ponto só dentro de número
    return f" {' '.join(texto.split())} "


def _e_numero(palavra: str) -> bool:
    return palavra.replace('.', '').isdigit()


def sugerir_catmat(termo: str, categoria: str | None = None) -> list[ItemCatmat]:
    """
    Itens do catálogo que contêm todas as palavras digitadas.
    Palavras casam pelo início ("SERING" acha "SERINGA"); números casam
    inteiros ("20" não acha "120"). Itens que começam pela primeira palavra
    vêm antes ("SERINGA, ..." antes de "AGULHA P/ SERINGA"); depois, os de
    descrição mais curta.
    """
    palavras = [p for p in normalizar(termo).split() if p not in PALAVRAS_IGNORADAS]
    if len((termo or '').strip()) < 3 or not palavras:
        return []

    filtro = Q()
    for palavra in palavras:
        sufixo = ' ' if _e_numero(palavra) else ''
        filtro &= Q(descricao_busca__contains=f' {palavra}{sufixo}')

    primeira = next((p for p in palavras if not _e_numero(p)), palavras[0])
    classes = CLASSES_POR_CATEGORIA.get(categoria or '', CLASSES_PADRAO)

    return list(
        ItemCatmat.objects.filter(filtro, codigo_classe__in=classes)
        .annotate(
            prioridade=Case(
                When(descricao_busca__startswith=f' {primeira}', then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            ),
            tamanho=Length('descricao'),
        )
        .order_by('prioridade', 'tamanho', 'codigo')[:LIMITE_SUGESTOES]
    )
